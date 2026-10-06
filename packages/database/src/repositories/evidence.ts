import {
  buildEvidenceArtifact,
  canonicalizeEvidence,
  createEvidenceEnvelope,
  createPublicEvidenceId,
  evidenceFields,
  evidenceTemplates,
  hashEvidenceArtifact,
  normalizeDisclosureFields,
  serializeEvidenceEnvelope,
  verifyEvidenceArtifact,
  type EvidenceArtifact,
  type EvidenceFieldKey,
  type EvidenceTemplate,
} from "@obliq/evidence";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { createDatabase } from "../index";
import {
  approvalRequirements,
  evidenceDisclosures,
  evidencePackages,
  evidencePreviews,
  obligations,
  organizations,
  settlementObservations,
  settlements,
  vendors,
} from "../schema";
import type { memberships } from "../schema";
import {
  appendAuditEvent,
  requireActiveMembership,
  type TenantActor,
} from "./index";

type Database = ReturnType<typeof createDatabase>["db"];
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type MembershipRole = (typeof memberships.role.enumValues)[number];

const evidenceCreateRoles: readonly MembershipRole[] = [
  "OWNER",
  "CFO",
  "FINANCE",
  "ACCOUNTANT",
];
const sensitiveDisclosureRoles: readonly MembershipRole[] = [
  "OWNER",
  "CFO",
  "ACCOUNTANT",
];
const evidenceAdminRoles: readonly MembershipRole[] = ["OWNER", "CFO"];

function requireRole(role: MembershipRole, allowed: readonly MembershipRole[]) {
  if (!allowed.includes(role))
    throw new Error("Actor is not authorized for this evidence operation");
}

async function lock(tx: Transaction, organizationId: string) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${organizationId}))`,
  );
}

function requiresSensitiveAuthority(fields: readonly EvidenceFieldKey[]) {
  return fields.some((field) =>
    ["FINANCE", "AUDIT"].includes(evidenceFields[field].classification),
  );
}

async function canonicalEvidenceSource(
  tx: Database | Transaction,
  organizationId: string,
  obligationId: string,
) {
  const rows = await tx
    .select({
      organization: organizations,
      obligation: obligations,
      vendor: vendors,
      settlement: settlements,
      observation: settlementObservations,
    })
    .from(obligations)
    .innerJoin(organizations, eq(organizations.id, obligations.organizationId))
    .innerJoin(
      vendors,
      and(
        eq(vendors.organizationId, organizationId),
        eq(vendors.id, obligations.vendorId),
      ),
    )
    .innerJoin(
      settlements,
      and(
        eq(settlements.organizationId, organizationId),
        eq(settlements.obligationId, obligations.id),
        eq(settlements.state, "SETTLED"),
      ),
    )
    .innerJoin(
      settlementObservations,
      and(
        eq(settlementObservations.organizationId, organizationId),
        eq(settlementObservations.settlementId, settlements.id),
        eq(settlementObservations.state, "SETTLED"),
        eq(settlementObservations.correlationStatus, "MATCHED"),
        eq(settlementObservations.txid, settlements.txRefPrivate),
      ),
    )
    .where(
      and(
        eq(obligations.organizationId, organizationId),
        eq(obligations.id, obligationId),
        eq(obligations.state, "SETTLED"),
      ),
    )
    .orderBy(desc(settlementObservations.confirmations))
    .limit(1);
  const source = rows[0];
  if (!source)
    throw new Error(
      "Evidence requires a canonically settled obligation and matching reconciliation observation",
    );
  const approvalRows = await tx
    .select({
      role: approvalRequirements.role,
      requiredCount: approvalRequirements.requiredCount,
      approvedCount: approvalRequirements.approvedCount,
      state: approvalRequirements.state,
    })
    .from(approvalRequirements)
    .where(
      and(
        eq(approvalRequirements.organizationId, organizationId),
        eq(approvalRequirements.obligationId, obligationId),
        eq(approvalRequirements.obligationVersion, source.obligation.version),
      ),
    )
    .orderBy(asc(approvalRequirements.role));
  return { ...source, approvalRows };
}

function availableClaims(
  source: Awaited<ReturnType<typeof canonicalEvidenceSource>>,
) {
  const settlementDate = source.settlement.settledAt;
  if (!settlementDate)
    throw new Error("Settled evidence requires a settlement timestamp");
  return {
    ISSUER_NAME: {
      classification: "PUBLIC_SAFE",
      provenance: "OBLIQ_BUSINESS_RECORD",
      value: source.organization.name,
    },
    OBLIGATION_REFERENCE: {
      classification: "PUBLIC_SAFE",
      provenance: "OBLIQ_BUSINESS_RECORD",
      value: source.obligation.reference,
    },
    PAYMENT_STATUS: {
      classification: "PUBLIC_SAFE",
      provenance: "ZCASH_RECONCILIATION",
      value: "SETTLED",
    },
    SETTLEMENT_DATE: {
      classification: "PUBLIC_SAFE",
      provenance: "ZCASH_RECONCILIATION",
      value: settlementDate.toISOString(),
    },
    VENDOR_NAME: {
      classification: "COUNTERPARTY",
      provenance: "OBLIQ_BUSINESS_RECORD",
      value: source.vendor.displayName,
    },
    BUSINESS_AMOUNT: {
      classification: "COUNTERPARTY",
      provenance: "OBLIQ_BUSINESS_RECORD",
      value: {
        currency: source.obligation.currency,
        minorUnits: source.obligation.amountMinor.toString(),
      },
    },
    CATEGORY: {
      classification: "FINANCE",
      provenance: "OBLIQ_BUSINESS_RECORD",
      value: source.obligation.category,
    },
    APPROVAL_SUMMARY: {
      classification: "FINANCE",
      provenance: "OBLIQ_AUTHORIZATION_RECORD",
      value: source.approvalRows.map((requirement) => ({
        approvedCount: requirement.approvedCount,
        requiredCount: requirement.requiredCount,
        role: requirement.role,
        state: requirement.state,
      })),
    },
    ZEC_AMOUNT: {
      classification: "FINANCE",
      provenance: "ZCASH_RECONCILIATION",
      value: { zatoshis: source.observation.observedAmountZat.toString() },
    },
    NETWORK: {
      classification: "FINANCE",
      provenance: "ZCASH_RECONCILIATION",
      value: source.observation.network,
    },
    CONFIRMATIONS: {
      classification: "FINANCE",
      provenance: "ZCASH_RECONCILIATION",
      value: source.observation.confirmations,
    },
    RECONCILIATION_RESULT: {
      classification: "FINANCE",
      provenance: "ZCASH_RECONCILIATION",
      value: source.observation.correlationStatus,
    },
    TRANSACTION_REFERENCE: {
      classification: "AUDIT",
      provenance: "ZCASH_RECONCILIATION",
      value: source.observation.txid,
    },
  } as const;
}

export async function previewEvidence(
  db: Database,
  actor: TenantActor,
  input: {
    obligationId: string;
    template: EvidenceTemplate;
    disclosedFields?: readonly string[];
    supersedesPackageId?: string;
  },
) {
  return db.transaction(async (tx) => {
    await lock(tx, actor.organizationId);
    const membership = await requireActiveMembership(tx, actor);
    requireRole(membership.role, evidenceCreateRoles);
    const templateFields = evidenceTemplates[input.template];
    if (!templateFields) throw new Error("Unsupported evidence template");
    const fields = normalizeDisclosureFields(
      input.disclosedFields
        ? ["ISSUER_NAME", ...input.disclosedFields]
        : templateFields,
    );
    if (requiresSensitiveAuthority(fields))
      requireRole(membership.role, sensitiveDisclosureRoles);
    const source = await canonicalEvidenceSource(
      tx,
      actor.organizationId,
      input.obligationId,
    );
    let superseded = null;
    if (input.supersedesPackageId) {
      const rows = await tx
        .select()
        .from(evidencePackages)
        .where(
          and(
            eq(evidencePackages.organizationId, actor.organizationId),
            eq(evidencePackages.id, input.supersedesPackageId),
            eq(evidencePackages.obligationId, input.obligationId),
            eq(evidencePackages.status, "ACTIVE"),
          ),
        )
        .limit(1);
      superseded = rows[0];
      if (!superseded)
        throw new Error("Active evidence package to supersede was not found");
    }
    const artifactCreatedAt = new Date();
    const publicId = createPublicEvidenceId();
    const version = (superseded?.version ?? 0) + 1;
    const artifact = buildEvidenceArtifact({
      evidenceId: publicId,
      version,
      createdAt: artifactCreatedAt,
      issuerName: source.organization.name,
      disclosedFields: fields,
      availableClaims: availableClaims(source),
    });
    const artifactHash = hashEvidenceArtifact(artifact);
    const [preview] = await tx
      .insert(evidencePreviews)
      .values({
        publicId,
        organizationId: actor.organizationId,
        obligationId: source.obligation.id,
        obligationVersion: source.obligation.version,
        settlementId: source.settlement.id,
        observationId: source.observation.id,
        supersedesPackageId: superseded?.id,
        version,
        template: input.template,
        artifactJson: artifact,
        artifactHash,
        disclosedFieldsJson: fields,
        createdBy: actor.userId,
        expiresAt: new Date(artifactCreatedAt.getTime() + 30 * 60_000),
      })
      .returning();
    if (!preview) throw new Error("Evidence preview insert failed");
    await appendAuditEvent(tx, actor, {
      eventType: "EVIDENCE_PREVIEWED",
      subjectType: "EVIDENCE_PREVIEW",
      subjectId: preview.id,
      payload: {
        obligationId: input.obligationId,
        template: input.template,
        disclosedFields: fields,
        artifactHash,
      },
    });
    return preview;
  });
}

export async function issueEvidence(
  db: Database,
  actor: TenantActor,
  previewId: string,
) {
  return db.transaction(async (tx) => {
    await lock(tx, actor.organizationId);
    const membership = await requireActiveMembership(tx, actor);
    requireRole(membership.role, evidenceCreateRoles);
    const rows = await tx
      .select()
      .from(evidencePreviews)
      .where(
        and(
          eq(evidencePreviews.organizationId, actor.organizationId),
          eq(evidencePreviews.id, previewId),
        ),
      )
      .limit(1);
    const preview = rows[0];
    if (!preview) return null;
    if (preview.issuedAt) {
      const existing = await tx
        .select()
        .from(evidencePackages)
        .where(eq(evidencePackages.publicId, preview.publicId))
        .limit(1);
      return existing[0] ?? null;
    }
    if (preview.expiresAt <= new Date())
      throw new Error(
        "Evidence preview expired; preview again before issuance",
      );
    if (requiresSensitiveAuthority(preview.disclosedFieldsJson))
      requireRole(membership.role, sensitiveDisclosureRoles);
    if (!verifyEvidenceArtifact(preview.artifactJson, preview.artifactHash))
      throw new Error("Evidence preview integrity verification failed");
    const source = await canonicalEvidenceSource(
      tx,
      actor.organizationId,
      preview.obligationId,
    );
    if (
      source.obligation.version !== preview.obligationVersion ||
      source.settlement.id !== preview.settlementId ||
      source.observation.id !== preview.observationId
    )
      throw new Error("Canonical evidence source changed; preview again");
    const [issued] = await tx
      .insert(evidencePackages)
      .values({
        publicId: preview.publicId,
        organizationId: actor.organizationId,
        obligationId: preview.obligationId,
        obligationVersion: preview.obligationVersion,
        settlementId: preview.settlementId,
        observationId: preview.observationId,
        supersedesPackageId: preview.supersedesPackageId,
        version: preview.version,
        template: preview.template,
        status: "ACTIVE",
        schemaVersion: preview.artifactJson.schema,
        hashAlgorithm: "SHA-256",
        artifactJson: preview.artifactJson,
        artifactHash: preview.artifactHash,
        disclosedFieldsJson: preview.disclosedFieldsJson,
        createdBy: actor.userId,
      })
      .returning();
    if (!issued) throw new Error("Evidence issuance failed");
    await tx.insert(evidenceDisclosures).values(
      preview.disclosedFieldsJson.map((field) => {
        const claim = preview.artifactJson.claims[field];
        if (!claim) throw new Error(`Issued claim is missing: ${field}`);
        return {
          organizationId: actor.organizationId,
          evidencePackageId: issued.id,
          fieldKey: field,
          classification: claim.classification,
          provenance: claim.provenance,
          disclosedValueHash: createHash("sha256")
            .update(canonicalizeEvidence(claim.value))
            .digest("hex"),
        };
      }),
    );
    if (preview.supersedesPackageId) {
      await tx
        .update(evidencePackages)
        .set({
          status: "SUPERSEDED",
          statusChangedAt: new Date(),
          statusChangedBy: actor.userId,
          statusReason: `Superseded by evidence ${issued.id}`,
        })
        .where(
          and(
            eq(evidencePackages.organizationId, actor.organizationId),
            eq(evidencePackages.id, preview.supersedesPackageId),
            eq(evidencePackages.status, "ACTIVE"),
          ),
        );
      await appendAuditEvent(tx, actor, {
        eventType: "EVIDENCE_SUPERSEDED",
        subjectType: "EVIDENCE_PACKAGE",
        subjectId: preview.supersedesPackageId,
        payload: {
          successorPackageId: issued.id,
          reason: "New version issued",
        },
      });
    }
    await tx
      .update(evidencePreviews)
      .set({ issuedAt: new Date() })
      .where(eq(evidencePreviews.id, preview.id));
    await appendAuditEvent(tx, actor, {
      eventType: "EVIDENCE_ISSUED",
      subjectType: "EVIDENCE_PACKAGE",
      subjectId: issued.id,
      payload: {
        obligationId: issued.obligationId,
        version: issued.version,
        template: issued.template,
        disclosedFields: issued.disclosedFieldsJson,
        artifactHash: issued.artifactHash,
      },
    });
    return issued;
  });
}

export async function changeEvidenceStatus(
  db: Database,
  actor: TenantActor,
  packageId: string,
  reason: string,
) {
  if (reason.trim().length < 5)
    throw new Error("Revocation reason is required");
  return db.transaction(async (tx) => {
    await lock(tx, actor.organizationId);
    requireRole(
      (await requireActiveMembership(tx, actor)).role,
      evidenceAdminRoles,
    );
    const [updated] = await tx
      .update(evidencePackages)
      .set({
        status: "REVOKED",
        statusChangedAt: new Date(),
        statusChangedBy: actor.userId,
        statusReason: reason.trim(),
      })
      .where(
        and(
          eq(evidencePackages.organizationId, actor.organizationId),
          eq(evidencePackages.id, packageId),
          eq(evidencePackages.status, "ACTIVE"),
        ),
      )
      .returning();
    if (!updated) return null;
    await appendAuditEvent(tx, actor, {
      eventType: "EVIDENCE_REVOKED",
      subjectType: "EVIDENCE_PACKAGE",
      subjectId: updated.id,
      payload: { reason: reason.trim() },
    });
    return updated;
  });
}

export async function listEvidencePackages(db: Database, actor: TenantActor) {
  const membership = await requireActiveMembership(db, actor);
  requireRole(membership.role, evidenceCreateRoles);
  return db
    .select({ package: evidencePackages, obligation: obligations })
    .from(evidencePackages)
    .innerJoin(
      obligations,
      and(
        eq(obligations.organizationId, actor.organizationId),
        eq(obligations.id, evidencePackages.obligationId),
      ),
    )
    .where(eq(evidencePackages.organizationId, actor.organizationId))
    .orderBy(desc(evidencePackages.createdAt));
}

export async function listEvidenceEligibleObligations(
  db: Database,
  actor: TenantActor,
) {
  const membership = await requireActiveMembership(db, actor);
  requireRole(membership.role, evidenceCreateRoles);
  return db
    .select({ obligation: obligations, vendor: vendors })
    .from(obligations)
    .innerJoin(
      vendors,
      and(
        eq(vendors.organizationId, actor.organizationId),
        eq(vendors.id, obligations.vendorId),
      ),
    )
    .where(
      and(
        eq(obligations.organizationId, actor.organizationId),
        eq(obligations.state, "SETTLED"),
      ),
    )
    .orderBy(desc(obligations.updatedAt));
}

export async function getEvidencePreview(
  db: Database,
  actor: TenantActor,
  previewId: string,
) {
  const membership = await requireActiveMembership(db, actor);
  requireRole(membership.role, evidenceCreateRoles);
  const rows = await db
    .select()
    .from(evidencePreviews)
    .where(
      and(
        eq(evidencePreviews.organizationId, actor.organizationId),
        eq(evidencePreviews.id, previewId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getEvidencePackage(
  db: Database,
  actor: TenantActor,
  packageId: string,
) {
  const membership = await requireActiveMembership(db, actor);
  requireRole(membership.role, evidenceCreateRoles);
  const rows = await db
    .select()
    .from(evidencePackages)
    .where(
      and(
        eq(evidencePackages.organizationId, actor.organizationId),
        eq(evidencePackages.id, packageId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function verifyPublicEvidence(db: Database, publicId: string) {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(publicId)) return null;
  const rows = await db
    .select()
    .from(evidencePackages)
    .where(eq(evidencePackages.publicId, publicId))
    .limit(1);
  const evidence = rows[0];
  if (!evidence) return null;
  return {
    evidence,
    integrityValid: verifyEvidenceArtifact(
      evidence.artifactJson,
      evidence.artifactHash,
    ),
  };
}

export function evidenceJsonArtifact(evidence: {
  artifactJson: EvidenceArtifact;
  artifactHash: string;
}) {
  return serializeEvidenceEnvelope(
    createEvidenceEnvelope(evidence.artifactJson, evidence.artifactHash),
  );
}
