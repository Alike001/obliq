import { createHash, randomBytes } from "node:crypto";

export type DisclosureClass =
  "PUBLIC_SAFE" | "COUNTERPARTY" | "FINANCE" | "AUDIT" | "NEVER_DISCLOSE";

export type EvidenceProvenance =
  | "OBLIQ_BUSINESS_RECORD"
  | "OBLIQ_AUTHORIZATION_RECORD"
  | "ZCASH_RECONCILIATION";

const evidenceProvenance = new Set<EvidenceProvenance>([
  "OBLIQ_BUSINESS_RECORD",
  "OBLIQ_AUTHORIZATION_RECORD",
  "ZCASH_RECONCILIATION",
]);

export const evidenceFields = {
  ISSUER_NAME: {
    label: "Issuer",
    classification: "PUBLIC_SAFE",
  },
  OBLIGATION_REFERENCE: {
    label: "Obligation reference",
    classification: "PUBLIC_SAFE",
  },
  PAYMENT_STATUS: {
    label: "Payment status",
    classification: "PUBLIC_SAFE",
  },
  SETTLEMENT_DATE: {
    label: "Settlement date",
    classification: "PUBLIC_SAFE",
  },
  VENDOR_NAME: {
    label: "Counterparty",
    classification: "COUNTERPARTY",
  },
  BUSINESS_AMOUNT: {
    label: "Business amount",
    classification: "COUNTERPARTY",
  },
  CATEGORY: { label: "Category", classification: "FINANCE" },
  APPROVAL_SUMMARY: {
    label: "Approval summary",
    classification: "FINANCE",
  },
  ZEC_AMOUNT: { label: "ZEC amount", classification: "FINANCE" },
  NETWORK: { label: "Zcash network", classification: "FINANCE" },
  CONFIRMATIONS: {
    label: "Confirmations",
    classification: "FINANCE",
  },
  RECONCILIATION_RESULT: {
    label: "Reconciliation result",
    classification: "FINANCE",
  },
  TRANSACTION_REFERENCE: {
    label: "Transaction reference",
    classification: "AUDIT",
  },
} as const satisfies Record<
  string,
  { label: string; classification: Exclude<DisclosureClass, "NEVER_DISCLOSE"> }
>;

export type EvidenceFieldKey = keyof typeof evidenceFields;
export type EvidenceTemplate =
  "MINIMAL_PAYMENT_CONFIRMATION" | "VENDOR_RECEIPT" | "ACCOUNTANT_EVIDENCE";

export const evidenceTemplates: Record<
  EvidenceTemplate,
  readonly EvidenceFieldKey[]
> = {
  MINIMAL_PAYMENT_CONFIRMATION: [
    "ISSUER_NAME",
    "OBLIGATION_REFERENCE",
    "PAYMENT_STATUS",
    "SETTLEMENT_DATE",
  ],
  VENDOR_RECEIPT: [
    "ISSUER_NAME",
    "OBLIGATION_REFERENCE",
    "VENDOR_NAME",
    "BUSINESS_AMOUNT",
    "PAYMENT_STATUS",
    "SETTLEMENT_DATE",
  ],
  ACCOUNTANT_EVIDENCE: [
    "ISSUER_NAME",
    "OBLIGATION_REFERENCE",
    "VENDOR_NAME",
    "BUSINESS_AMOUNT",
    "CATEGORY",
    "APPROVAL_SUMMARY",
    "PAYMENT_STATUS",
    "SETTLEMENT_DATE",
    "ZEC_AMOUNT",
    "NETWORK",
    "TRANSACTION_REFERENCE",
    "CONFIRMATIONS",
    "RECONCILIATION_RESULT",
  ],
};

export const forbiddenEvidenceFields = [
  "DESTINATION_RECEIVER",
  "DESTINATION_FINGERPRINT",
  "MEMO",
  "MEMO_REFERENCE",
  "VIEWING_AUTHORITY",
  "SPENDING_AUTHORITY",
  "SEED_MATERIAL",
  "SIGNER_CREDENTIAL",
  "RAW_TRANSACTION",
  "INTERNAL_POLICY_FINDINGS",
] as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  JsonPrimitive | JsonValue[] | { readonly [key: string]: JsonValue };

export interface EvidenceClaim {
  classification: Exclude<DisclosureClass, "NEVER_DISCLOSE">;
  provenance: EvidenceProvenance;
  value: JsonValue;
}

export interface EvidenceArtifact {
  schema: "obliq.evidence.v1";
  evidenceId: string;
  version: number;
  createdAt: string;
  issuer: { name: string };
  disclosedFields: EvidenceFieldKey[];
  claims: Partial<Record<EvidenceFieldKey, EvidenceClaim>>;
}

export interface EvidenceEnvelope {
  artifact: EvidenceArtifact;
  integrity: {
    algorithm: "SHA-256";
    contentHash: string;
  };
}

export function createPublicEvidenceId(): string {
  return randomBytes(32).toString("base64url");
}

export function isEvidenceFieldKey(value: string): value is EvidenceFieldKey {
  return Object.hasOwn(evidenceFields, value);
}

export function normalizeDisclosureFields(
  fields: readonly string[],
): EvidenceFieldKey[] {
  const unique = [...new Set(fields)];
  if (unique.length === 0) throw new Error("At least one field is required");
  for (const field of unique)
    if (!isEvidenceFieldKey(field))
      throw new Error(`Evidence field is not disclosable: ${field}`);
  return (unique as EvidenceFieldKey[]).sort();
}

export function buildEvidenceArtifact(input: {
  evidenceId: string;
  version: number;
  createdAt: Date;
  issuerName: string;
  disclosedFields: readonly string[];
  availableClaims: Partial<Record<EvidenceFieldKey, EvidenceClaim>>;
}): EvidenceArtifact {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(input.evidenceId))
    throw new Error("Evidence ID must contain 256 bits of URL-safe entropy");
  if (!Number.isSafeInteger(input.version) || input.version < 1)
    throw new Error("Evidence version must be a positive integer");
  if (!input.issuerName.trim()) throw new Error("Issuer name is required");
  const disclosedFields = normalizeDisclosureFields(input.disclosedFields);
  const claims: Partial<Record<EvidenceFieldKey, EvidenceClaim>> = {};
  for (const field of disclosedFields) {
    const claim = input.availableClaims[field];
    if (!claim) throw new Error(`Canonical claim is unavailable: ${field}`);
    if (claim.classification !== evidenceFields[field].classification)
      throw new Error(`Disclosure classification mismatch: ${field}`);
    claims[field] = claim;
  }
  return {
    schema: "obliq.evidence.v1",
    evidenceId: input.evidenceId,
    version: input.version,
    createdAt: input.createdAt.toISOString(),
    issuer: { name: input.issuerName.trim() },
    disclosedFields,
    claims,
  };
}

export function canonicalizeEvidence(value: JsonValue): string {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value))
      throw new Error("Evidence numbers must be safe integers");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const items: JsonValue[] = value;
    return `[${items.map((item) => canonicalizeEvidence(item)).join(",")}]`;
  }
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, item]) => `${JSON.stringify(key)}:${canonicalizeEvidence(item)}`,
    )
    .join(",")}}`;
}

export function hashEvidenceArtifact(artifact: EvidenceArtifact): string {
  return createHash("sha256")
    .update(canonicalizeEvidence(artifact as unknown as JsonValue), "utf8")
    .digest("hex");
}

export function verifyEvidenceArtifact(
  artifact: EvidenceArtifact,
  expectedHash: string,
): boolean {
  try {
    if (!/^[0-9a-f]{64}$/u.test(expectedHash)) return false;
    if (
      artifact.schema !== "obliq.evidence.v1" ||
      !/^[A-Za-z0-9_-]{43}$/u.test(artifact.evidenceId) ||
      !Number.isSafeInteger(artifact.version) ||
      artifact.version < 1 ||
      new Date(artifact.createdAt).toISOString() !== artifact.createdAt ||
      !artifact.issuer.name.trim()
    )
      return false;
    if (
      normalizeDisclosureFields(artifact.disclosedFields).join("|") !==
      artifact.disclosedFields.join("|")
    )
      return false;
    if (
      Object.keys(artifact.claims).sort().join("|") !==
      artifact.disclosedFields.join("|")
    )
      return false;
    for (const field of artifact.disclosedFields) {
      const claim = artifact.claims[field];
      if (
        !claim ||
        claim.classification !== evidenceFields[field].classification ||
        !evidenceProvenance.has(claim.provenance)
      )
        return false;
      canonicalizeEvidence(claim.value);
    }
    return hashEvidenceArtifact(artifact) === expectedHash;
  } catch {
    return false;
  }
}

export function createEvidenceEnvelope(
  artifact: EvidenceArtifact,
  contentHash = hashEvidenceArtifact(artifact),
): EvidenceEnvelope {
  if (!verifyEvidenceArtifact(artifact, contentHash))
    throw new Error("Evidence artifact failed integrity verification");
  return { artifact, integrity: { algorithm: "SHA-256", contentHash } };
}

export function serializeEvidenceEnvelope(envelope: EvidenceEnvelope): string {
  return `${canonicalizeEvidence(envelope as unknown as JsonValue)}\n`;
}
