import { describe, expect, it } from "vitest";
import {
  buildEvidenceArtifact,
  createEvidenceEnvelope,
  createPublicEvidenceId,
  evidenceTemplates,
  hashEvidenceArtifact,
  normalizeDisclosureFields,
  serializeEvidenceEnvelope,
  verifyEvidenceArtifact,
  type EvidenceClaim,
} from "./index";

const claims = {
  ISSUER_NAME: {
    classification: "PUBLIC_SAFE",
    provenance: "OBLIQ_BUSINESS_RECORD",
    value: "Obliq Test Organization",
  },
  OBLIGATION_REFERENCE: {
    classification: "PUBLIC_SAFE",
    provenance: "OBLIQ_BUSINESS_RECORD",
    value: "INV-42",
  },
  PAYMENT_STATUS: {
    classification: "PUBLIC_SAFE",
    provenance: "ZCASH_RECONCILIATION",
    value: "SETTLED",
  },
  SETTLEMENT_DATE: {
    classification: "PUBLIC_SAFE",
    provenance: "ZCASH_RECONCILIATION",
    value: "2026-10-06T12:00:00.000Z",
  },
  VENDOR_NAME: {
    classification: "COUNTERPARTY",
    provenance: "OBLIQ_BUSINESS_RECORD",
    value: "Example Vendor",
  },
  BUSINESS_AMOUNT: {
    classification: "COUNTERPARTY",
    provenance: "OBLIQ_BUSINESS_RECORD",
    value: { currency: "USD", minorUnits: "12500" },
  },
  TRANSACTION_REFERENCE: {
    classification: "AUDIT",
    provenance: "ZCASH_RECONCILIATION",
    value: "ab".repeat(32),
  },
} satisfies Record<string, EvidenceClaim>;

function artifact(fields = evidenceTemplates.MINIMAL_PAYMENT_CONFIRMATION) {
  return buildEvidenceArtifact({
    evidenceId: "A".repeat(43),
    version: 1,
    createdAt: new Date("2026-10-06T12:30:00.000Z"),
    issuerName: "Obliq Test Organization",
    disclosedFields: fields,
    availableClaims: claims,
  });
}

describe("controlled evidence", () => {
  it("creates high-entropy non-enumerable public identifiers", () => {
    const first = createPublicEvidenceId();
    const second = createPublicEvidenceId();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(second).not.toBe(first);
  });

  it("canonicalizes and hashes the same content deterministically", () => {
    const value = artifact();
    expect(hashEvidenceArtifact(value)).toBe(hashEvidenceArtifact(value));
    expect(hashEvidenceArtifact(value)).toHaveLength(64);
  });

  it("rejects forbidden or unknown disclosure keys", () => {
    expect(() => normalizeDisclosureFields(["MEMO"])).toThrow(
      "not disclosable",
    );
    expect(() => normalizeDisclosureFields(["VIEWING_AUTHORITY"])).toThrow(
      "not disclosable",
    );
  });

  it("minimal evidence contains no counterparty or treasury facts", () => {
    const value = artifact();
    const serialized = serializeEvidenceEnvelope(createEvidenceEnvelope(value));
    expect(serialized).not.toContain("Example Vendor");
    expect(serialized).not.toContain("minorUnits");
    expect(serialized).not.toContain("TRANSACTION_REFERENCE");
    expect(serialized).not.toContain("APPROVAL_SUMMARY");
    expect(serialized).not.toContain("destination");
    expect(serialized).not.toContain("memo");
  });

  it.each([
    ["amount", "BUSINESS_AMOUNT", { currency: "USD", minorUnits: "99900" }],
    ["vendor", "VENDOR_NAME", "Changed Vendor"],
    ["status", "PAYMENT_STATUS", "CONFIRMING"],
    ["settlement date", "SETTLEMENT_DATE", "2026-10-07T00:00:00.000Z"],
    ["transaction reference", "TRANSACTION_REFERENCE", "cd".repeat(32)],
  ])("detects tampering with %s", (_label, field, changed) => {
    const value = artifact([
      "OBLIGATION_REFERENCE",
      "VENDOR_NAME",
      "BUSINESS_AMOUNT",
      "PAYMENT_STATUS",
      "SETTLEMENT_DATE",
      "TRANSACTION_REFERENCE",
    ]);
    const hash = hashEvidenceArtifact(value);
    const tampered = structuredClone(value);
    tampered.claims[field as keyof typeof tampered.claims]!.value = changed;
    expect(verifyEvidenceArtifact(tampered, hash)).toBe(false);
  });

  it("detects manifest and artifact-version tampering", () => {
    const value = artifact();
    const hash = hashEvidenceArtifact(value);
    const manifestTamper = structuredClone(value);
    manifestTamper.disclosedFields = ["PAYMENT_STATUS"];
    expect(verifyEvidenceArtifact(manifestTamper, hash)).toBe(false);
    const versionTamper = structuredClone(value);
    versionTamper.version = 2;
    expect(verifyEvidenceArtifact(versionTamper, hash)).toBe(false);
    const timestampTamper = structuredClone(value);
    timestampTamper.createdAt = "2026-10-06T12:31:00.000Z";
    expect(verifyEvidenceArtifact(timestampTamper, hash)).toBe(false);
  });
});
