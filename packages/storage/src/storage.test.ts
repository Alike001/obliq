import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LocalDocumentStorage,
  HttpDocumentScanner,
  S3PrivateDocumentStorage,
  detectInvoiceMediaType,
  validateInvoiceDocument,
} from "./index";

afterEach(() => vi.unstubAllGlobals());

describe("invoice document validation", () => {
  const pdf = new TextEncoder().encode("%PDF-1.7 safe fixture");
  it("uses magic bytes rather than trusting the filename", () => {
    expect(detectInvoiceMediaType(pdf)).toBe("application/pdf");
    expect(
      validateInvoiceDocument(pdf, "application/pdf").contentHash,
    ).toHaveLength(64);
  });
  it("rejects MIME mismatch, unknown content, empty and oversized files", () => {
    expect(() => validateInvoiceDocument(pdf, "image/png")).toThrow(
      "does not match",
    );
    expect(() =>
      validateInvoiceDocument(new Uint8Array([1, 2, 3]), "application/pdf"),
    ).toThrow("Unsupported");
    expect(() =>
      validateInvoiceDocument(new Uint8Array(), "application/pdf"),
    ).toThrow("empty");
    expect(() => validateInvoiceDocument(pdf, "application/pdf", 2)).toThrow(
      "size limit",
    );
  });
});

describe("production document boundaries", () => {
  it("rejects plaintext storage and scanner endpoints", () => {
    expect(
      () =>
        new S3PrivateDocumentStorage({
          bucket: "private",
          region: "local",
          endpoint: "http://storage.internal",
        }),
    ).toThrow("HTTPS");
    expect(
      () => new HttpDocumentScanner("http://scanner.internal", "x".repeat(32)),
    ).toThrow("HTTPS");
  });

  it("accepts only strict clean or rejected scanner responses", async () => {
    const scanner = new HttpDocumentScanner(
      "https://scanner.internal/scan",
      "x".repeat(32),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "CLEAN", scanner: "clamav" }), {
          status: 200,
        }),
      ),
    );
    await expect(
      scanner.scan({
        storageRef: "s3://private/quarantine/object",
        contentHash: "a".repeat(64),
        mediaType: "application/pdf",
      }),
    ).resolves.toMatchObject({ status: "CLEAN", scanner: "clamav" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "MAYBE", scanner: "unknown" }), {
          status: 200,
        }),
      ),
    );
    await expect(
      scanner.scan({
        storageRef: "s3://private/quarantine/object",
        contentHash: "a".repeat(64),
        mediaType: "application/pdf",
      }),
    ).rejects.toThrow("Malformed");
  });
});

describe("local document storage", () => {
  it("uses generated organization-scoped identifiers and blocks traversal", async () => {
    const root = await mkdtemp(join(tmpdir(), "obliq-storage-"));
    try {
      const storage = new LocalDocumentStorage(root);
      const bytes = new TextEncoder().encode("%PDF-1.7 private");
      const stored = await storage.put({
        organizationId: "00000000-0000-4000-8000-000000000002",
        bytes,
        mediaType: "application/pdf",
        contentHash: validateInvoiceDocument(bytes, "application/pdf")
          .contentHash,
      });
      expect(stored.storageRef).toMatch(
        /^00000000-0000-4000-8000-000000000002\/[0-9a-f-]+\.bin$/,
      );
      expect(await readFile(join(root, stored.storageRef))).toEqual(
        Buffer.from(bytes),
      );
      await expect(storage.remove("../outside.bin")).rejects.toThrow("Unsafe");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
