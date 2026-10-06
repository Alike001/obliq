import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export const allowedInvoiceTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
] as const;
export const defaultMaxUploadBytes = 10 * 1024 * 1024;

export function detectInvoiceMediaType(
  bytes: Uint8Array,
): (typeof allowedInvoiceTypes)[number] | null {
  if (
    bytes.length >= 5 &&
    new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-"
  )
    return "application/pdf";
  if (
    bytes.length >= 8 &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
  )
    return "image/png";
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  )
    return "image/jpeg";
  return null;
}

export function validateInvoiceDocument(
  bytes: Uint8Array,
  declaredType: string,
  maxBytes = defaultMaxUploadBytes,
) {
  if (bytes.length === 0) throw new Error("Invoice file is empty");
  if (bytes.length > maxBytes)
    throw new Error("Invoice file exceeds the size limit");
  const detectedType = detectInvoiceMediaType(bytes);
  if (!detectedType || !allowedInvoiceTypes.includes(detectedType))
    throw new Error("Unsupported invoice file content");
  if (declaredType !== detectedType)
    throw new Error("Invoice MIME type does not match file content");
  return {
    mediaType: detectedType,
    contentHash: createHash("sha256").update(bytes).digest("hex"),
  };
}

export interface DocumentStorage {
  put(input: {
    organizationId: string;
    bytes: Uint8Array;
    mediaType: (typeof allowedInvoiceTypes)[number];
    contentHash: string;
  }): Promise<{ storageRef: string }>;
  remove(storageRef: string): Promise<void>;
}

export class LocalDocumentStorage implements DocumentStorage {
  constructor(private readonly root: string) {}
  async put(input: {
    organizationId: string;
    bytes: Uint8Array;
    mediaType: (typeof allowedInvoiceTypes)[number];
    contentHash: string;
  }) {
    if (!/^[0-9a-f-]{36}$/i.test(input.organizationId))
      throw new Error("Invalid organization storage scope");
    const directory = resolve(this.root, input.organizationId);
    const path = resolve(directory, `${randomUUID()}.bin`);
    if (!path.startsWith(`${resolve(this.root)}${sep}`))
      throw new Error("Unsafe storage path");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await writeFile(path, input.bytes, { mode: 0o600, flag: "wx" });
    return { storageRef: path.slice(resolve(this.root).length + 1) };
  }
  async remove(storageRef: string) {
    const path = resolve(this.root, storageRef);
    if (!path.startsWith(`${resolve(this.root)}${sep}`))
      throw new Error("Unsafe storage path");
    await unlink(path).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

export interface PrivateObjectStorageConfig {
  bucket: string;
  region: string;
  endpoint?: string;
  kmsKeyId?: string;
}

export class S3PrivateDocumentStorage implements DocumentStorage {
  private readonly client: S3Client;
  constructor(private readonly config: PrivateObjectStorageConfig) {
    if (!config.bucket.trim() || !config.region.trim())
      throw new Error("Private object storage bucket and region are required");
    if (config.endpoint && new URL(config.endpoint).protocol !== "https:")
      throw new Error("Production object storage endpoint must use HTTPS");
    this.client = new S3Client({
      region: config.region,
      ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    });
  }

  async put(input: {
    organizationId: string;
    bytes: Uint8Array;
    mediaType: (typeof allowedInvoiceTypes)[number];
    contentHash: string;
  }) {
    if (!/^[0-9a-f-]{36}$/iu.test(input.organizationId))
      throw new Error("Invalid organization storage scope");
    if (!/^[0-9a-f]{64}$/u.test(input.contentHash))
      throw new Error("Invalid document content hash");
    const key = `quarantine/${input.organizationId}/${randomUUID()}.bin`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: input.bytes,
        ContentType: "application/octet-stream",
        CacheControl: "private, no-store, max-age=0",
        ServerSideEncryption: this.config.kmsKeyId ? "aws:kms" : "AES256",
        ...(this.config.kmsKeyId ? { SSEKMSKeyId: this.config.kmsKeyId } : {}),
        Metadata: {
          "content-sha256": input.contentHash,
          "declared-media-type": input.mediaType,
          "organization-id": input.organizationId,
          "security-state": "quarantine",
        },
      }),
    );
    return { storageRef: `s3://${this.config.bucket}/${key}` };
  }

  async remove(storageRef: string) {
    const prefix = `s3://${this.config.bucket}/`;
    if (!storageRef.startsWith(prefix)) throw new Error("Unsafe storage ref");
    const key = storageRef.slice(prefix.length);
    if (!/^quarantine\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.bin$/iu.test(key))
      throw new Error("Unsafe storage ref");
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
  }
}

export type DocumentScanResult =
  | { status: "CLEAN"; scanner: string; scannedAt: Date }
  | { status: "REJECTED"; scanner: string; scannedAt: Date; reasonCode: string }
  | { status: "DEVELOPMENT_UNSCANNED"; scanner: "development-none" };

export interface DocumentScanner {
  scan(input: {
    storageRef: string;
    contentHash: string;
    mediaType: (typeof allowedInvoiceTypes)[number];
  }): Promise<DocumentScanResult>;
}

export class DevelopmentNoopScanner implements DocumentScanner {
  scan() {
    return Promise.resolve({
      status: "DEVELOPMENT_UNSCANNED" as const,
      scanner: "development-none" as const,
    });
  }
}

export class HttpDocumentScanner implements DocumentScanner {
  constructor(
    private readonly endpoint: string,
    private readonly bearerToken: string,
  ) {
    if (new URL(endpoint).protocol !== "https:")
      throw new Error("Document scanner must use HTTPS");
    if (bearerToken.length < 20)
      throw new Error("Document scanner credential is invalid");
  }

  async scan(input: {
    storageRef: string;
    contentHash: string;
    mediaType: (typeof allowedInvoiceTypes)[number];
  }): Promise<DocumentScanResult> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error("Document scanner unavailable");
    const value: unknown = await response.json();
    if (!value || typeof value !== "object")
      throw new Error("Malformed document scanner response");
    const result = value as Record<string, unknown>;
    const scanner =
      typeof result.scanner === "string" ? result.scanner.slice(0, 80) : "";
    if (!scanner) throw new Error("Malformed document scanner response");
    if (result.status === "CLEAN")
      return { status: "CLEAN", scanner, scannedAt: new Date() };
    if (result.status === "REJECTED" && typeof result.reasonCode === "string")
      return {
        status: "REJECTED",
        scanner,
        scannedAt: new Date(),
        reasonCode: result.reasonCode.slice(0, 80),
      };
    throw new Error("Malformed document scanner response");
  }
}
