import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";

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
  }): Promise<{ storageRef: string }>;
  remove(storageRef: string): Promise<void>;
}

export class LocalDocumentStorage implements DocumentStorage {
  constructor(private readonly root: string) {}
  async put(input: { organizationId: string; bytes: Uint8Array }) {
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
