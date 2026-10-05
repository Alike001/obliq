import { describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LocalDocumentStorage,
  detectInvoiceMediaType,
  validateInvoiceDocument,
} from "./index";

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

describe("local document storage", () => {
  it("uses generated organization-scoped identifiers and blocks traversal", async () => {
    const root = await mkdtemp(join(tmpdir(), "obliq-storage-"));
    try {
      const storage = new LocalDocumentStorage(root);
      const bytes = new TextEncoder().encode("%PDF-1.7 private");
      const stored = await storage.put({
        organizationId: "00000000-0000-4000-8000-000000000002",
        bytes,
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
