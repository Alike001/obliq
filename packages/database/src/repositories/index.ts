import {
  classifyDuplicate,
  destinationInputSchema,
  validateObligationInput,
  vendorInputSchema,
  type DestinationInput,
  type VendorInput,
} from "@obliq/domain";
import { and, asc, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { createDatabase } from "../index";
import {
  auditEvents,
  approvalRequirements,
  approvals,
  duplicateFindings,
  extractionRuns,
  memberships,
  obligationSources,
  obligationVersions,
  obligations,
  settlementIntents,
  settlements,
  vendorDestinations,
  vendors,
} from "../schema";

export type Database = ReturnType<typeof createDatabase>["db"];
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Executor = Database | Transaction;
type MembershipRole = (typeof memberships.role.enumValues)[number];
const financeWriteRoles: readonly MembershipRole[] = [
  "OWNER",
  "FINANCE",
  "ACCOUNTANT",
  "CFO",
];
const destinationWriteRoles: readonly MembershipRole[] = [
  ...financeWriteRoles,
  "TREASURY",
];

async function requireWriteRole(
  tx: Executor,
  actor: TenantActor,
  allowed: readonly MembershipRole[],
) {
  const rows = await tx
    .select({ role: memberships.role })
    .from(memberships)
    .where(
      and(
        eq(memberships.organizationId, actor.organizationId),
        eq(memberships.userId, actor.userId),
        eq(memberships.status, "ACTIVE"),
      ),
    )
    .limit(1);
  if (!rows[0] || !allowed.includes(rows[0].role))
    throw new Error("Actor is not authorized for this finance operation");
}

export interface TenantActor {
  organizationId: string;
  userId: string;
}

export async function checkDatabaseConnection(db: Database) {
  await db.execute(sql`select 1 as healthy`);
  return true;
}

export async function requireActiveMembership(
  db: Executor,
  actor: TenantActor,
) {
  const rows = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(memberships.organizationId, actor.organizationId),
        eq(memberships.userId, actor.userId),
        eq(memberships.status, "ACTIVE"),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new Error("No active organization membership");
  return rows[0];
}

export interface AuditInput {
  eventType: string;
  subjectType: string;
  subjectId: string;
  payload?: Record<string, unknown>;
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export async function appendAuditEvent(
  tx: Transaction,
  actor: TenantActor,
  input: AuditInput,
) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${actor.organizationId}))`,
  );
  const previous = await tx
    .select({ payloadHash: auditEvents.payloadHash })
    .from(auditEvents)
    .where(eq(auditEvents.organizationId, actor.organizationId))
    .orderBy(desc(auditEvents.chainSequence))
    .limit(1);
  const previousHash = previous[0]?.payloadHash ?? null;
  const payloadJson = input.payload ?? {};
  const payloadHash = createHash("sha256")
    .update(
      canonical({
        actorId: actor.userId,
        actorType: "USER",
        eventType: input.eventType,
        organizationId: actor.organizationId,
        payloadJson,
        previousHash,
        subjectId: input.subjectId,
        subjectType: input.subjectType,
      }),
    )
    .digest("hex");
  const [event] = await tx
    .insert(auditEvents)
    .values({
      organizationId: actor.organizationId,
      actorType: "USER",
      actorId: actor.userId,
      eventType: input.eventType,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      payloadHash,
      previousHash,
      payloadJson,
    })
    .returning();
  return event;
}

export async function verifyAuditChain(db: Database, organizationId: string) {
  const events = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.organizationId, organizationId))
    .orderBy(asc(auditEvents.chainSequence));
  let previousHash: string | null = null;
  for (const event of events) {
    const expected: string = createHash("sha256")
      .update(
        canonical({
          actorId: event.actorId,
          actorType: event.actorType,
          eventType: event.eventType,
          organizationId: event.organizationId,
          payloadJson: event.payloadJson,
          previousHash,
          subjectId: event.subjectId,
          subjectType: event.subjectType,
        }),
      )
      .digest("hex");
    if (event.previousHash !== previousHash || event.payloadHash !== expected)
      return {
        valid: false,
        eventCount: events.length,
        invalidEventId: event.id,
      };
    previousHash = event.payloadHash;
  }
  return { valid: true, eventCount: events.length };
}

export async function createVendor(
  db: Database,
  actor: TenantActor,
  input: VendorInput,
) {
  const value = vendorInputSchema.parse(input);
  const result = await db.transaction(async (tx) => {
    await requireWriteRole(tx, actor, financeWriteRoles);
    const [vendor] = await tx
      .insert(vendors)
      .values({ organizationId: actor.organizationId, ...value })
      .returning();
    if (!vendor) throw new Error("Vendor insert did not return a record");
    await appendAuditEvent(tx, actor, {
      eventType: "VENDOR_CREATED",
      subjectType: "VENDOR",
      subjectId: vendor.id,
      payload: { displayName: vendor.displayName },
    });
    return vendor;
  });
  return result;
}

export function listVendors(db: Executor, organizationId: string) {
  return db
    .select()
    .from(vendors)
    .where(eq(vendors.organizationId, organizationId))
    .orderBy(asc(vendors.displayName))
    .limit(100);
}

export async function getVendor(
  db: Executor,
  organizationId: string,
  vendorId: string,
) {
  const rows = await db
    .select()
    .from(vendors)
    .where(
      and(eq(vendors.organizationId, organizationId), eq(vendors.id, vendorId)),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function updateVendor(
  db: Database,
  actor: TenantActor,
  vendorId: string,
  input: VendorInput,
) {
  const value = vendorInputSchema.parse(input);
  return db.transaction(async (tx) => {
    await requireWriteRole(tx, actor, financeWriteRoles);
    const [vendor] = await tx
      .update(vendors)
      .set({ ...value, updatedAt: new Date() })
      .where(
        and(
          eq(vendors.organizationId, actor.organizationId),
          eq(vendors.id, vendorId),
        ),
      )
      .returning();
    if (!vendor) return null;
    await appendAuditEvent(tx, actor, {
      eventType: "VENDOR_EDITED",
      subjectType: "VENDOR",
      subjectId: vendor.id,
      payload: { version: vendor.updatedAt.toISOString() },
    });
    return vendor;
  });
}

export async function addVendorDestination(
  db: Database,
  actor: TenantActor,
  vendorId: string,
  input: DestinationInput,
) {
  const value = destinationInputSchema.parse(input);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${actor.organizationId}))`,
    );
    await requireWriteRole(tx, actor, destinationWriteRoles);
    const vendor = await getVendor(tx, actor.organizationId, vendorId);
    if (!vendor) return null;
    await tx
      .update(vendorDestinations)
      .set({ supersededAt: new Date(), verificationStatus: "SUPERSEDED" })
      .where(
        and(
          eq(vendorDestinations.organizationId, actor.organizationId),
          eq(vendorDestinations.vendorId, vendorId),
          ne(vendorDestinations.verificationStatus, "SUPERSEDED"),
        ),
      );
    const fingerprint = createHash("sha256")
      .update(value.receiver)
      .digest("hex");
    const [destination] = await tx
      .insert(vendorDestinations)
      .values({
        organizationId: actor.organizationId,
        vendorId,
        ...value,
        fingerprint,
        verificationStatus: "UNVERIFIED",
      })
      .returning();
    if (!destination)
      throw new Error("Destination insert did not return a record");
    await appendAuditEvent(tx, actor, {
      eventType: "VENDOR_DESTINATION_CHANGED",
      subjectType: "VENDOR_DESTINATION",
      subjectId: destination.id,
      payload: { vendorId, fingerprint, verificationStatus: "UNVERIFIED" },
    });
    const affected = await tx
      .select({ id: obligations.id })
      .from(obligations)
      .where(
        and(
          eq(obligations.organizationId, actor.organizationId),
          eq(obligations.vendorId, vendorId),
          sql`${obligations.state} in ('APPROVAL_REQUIRED','APPROVED','READY_TO_SETTLE','SETTLEMENT_PREPARED','SIGNING','BLOCKED')`,
        ),
      );
    for (const item of affected) {
      const invalidatedIntents = await tx
        .update(settlementIntents)
        .set({
          state: "INVALIDATED",
          invalidatedAt: new Date(),
          invalidationReason: "Vendor destination changed",
        })
        .where(
          and(
            eq(settlementIntents.organizationId, actor.organizationId),
            eq(settlementIntents.obligationId, item.id),
            sql`${settlementIntents.invalidatedAt} is null`,
          ),
        )
        .returning({ id: settlementIntents.id });
      await tx
        .update(settlements)
        .set({ state: "INVALIDATED", errorCode: "DESTINATION_CHANGED" })
        .where(
          and(
            eq(settlements.organizationId, actor.organizationId),
            eq(settlements.obligationId, item.id),
            sql`${settlements.state} not in ('SETTLED','INVALIDATED')`,
          ),
        );
      const invalidated = await tx
        .update(approvals)
        .set({
          invalidatedAt: new Date(),
          invalidationReason: "Vendor destination changed",
        })
        .where(
          and(
            eq(approvals.organizationId, actor.organizationId),
            eq(approvals.obligationId, item.id),
            sql`${approvals.invalidatedAt} is null`,
          ),
        )
        .returning({ id: approvals.id });
      await tx
        .update(approvalRequirements)
        .set({ state: "INVALIDATED" })
        .where(
          and(
            eq(approvalRequirements.organizationId, actor.organizationId),
            eq(approvalRequirements.obligationId, item.id),
            ne(approvalRequirements.state, "INVALIDATED"),
          ),
        );
      await tx
        .update(obligations)
        .set({
          state: "UNDER_REVIEW",
          destinationId: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(obligations.organizationId, actor.organizationId),
            eq(obligations.id, item.id),
          ),
        );
      for (const approval of invalidated)
        await appendAuditEvent(tx, actor, {
          eventType: "APPROVAL_INVALIDATED",
          subjectType: "APPROVAL",
          subjectId: approval.id,
          payload: {
            obligationId: item.id,
            reason: "Vendor destination changed",
          },
        });
      for (const intent of invalidatedIntents)
        await appendAuditEvent(tx, actor, {
          eventType: "SETTLEMENT_INTENT_INVALIDATED",
          subjectType: "SETTLEMENT_INTENT",
          subjectId: intent.id,
          payload: {
            obligationId: item.id,
            reason: "Vendor destination changed",
          },
        });
    }
    return destination;
  });
}

export function listVendorDestinations(
  db: Executor,
  organizationId: string,
  vendorId: string,
) {
  return db
    .select()
    .from(vendorDestinations)
    .where(
      and(
        eq(vendorDestinations.organizationId, organizationId),
        eq(vendorDestinations.vendorId, vendorId),
      ),
    )
    .orderBy(desc(vendorDestinations.createdAt));
}

export interface SourceInput {
  kind: "MANUAL" | "INVOICE_UPLOAD";
  storageRef?: string;
  contentHash?: string;
  metadata: Record<string, unknown>;
  storageMode?: "LOCAL_DEVELOPMENT" | "S3_PRIVATE";
  scanStatus?: "NOT_REQUIRED" | "DEVELOPMENT_UNSCANNED" | "CLEAN";
  quarantinedAt?: Date;
  scannedAt?: Date;
  retentionUntil?: Date;
  extraction?: {
    provider: string;
    mode: "LIVE" | "SEEDED_FIXTURE";
    status: "COMPLETED" | "FAILED";
    result: unknown;
  };
}

export async function createSource(
  db: Database,
  actor: TenantActor,
  input: SourceInput,
) {
  if (
    input.kind === "INVOICE_UPLOAD" &&
    input.scanStatus !== "DEVELOPMENT_UNSCANNED" &&
    input.scanStatus !== "CLEAN"
  )
    throw new Error("Uploaded invoice must pass the configured scan boundary");
  return db.transaction(async (tx) => {
    await requireWriteRole(tx, actor, financeWriteRoles);
    const [source] = await tx
      .insert(obligationSources)
      .values({
        organizationId: actor.organizationId,
        kind: input.kind,
        storageRef: input.storageRef,
        contentHash: input.contentHash,
        metadataJson: input.metadata,
        storageMode: input.storageMode ?? "LOCAL_DEVELOPMENT",
        scanStatus: input.scanStatus ?? "NOT_REQUIRED",
        quarantinedAt: input.quarantinedAt,
        scannedAt: input.scannedAt,
        retentionUntil: input.retentionUntil,
      })
      .returning();
    if (!source) throw new Error("Source insert did not return a record");
    await appendAuditEvent(tx, actor, {
      eventType:
        input.kind === "INVOICE_UPLOAD" ? "SOURCE_UPLOADED" : "SOURCE_CREATED",
      subjectType: "OBLIGATION_SOURCE",
      subjectId: source.id,
      payload: { contentHash: input.contentHash, kind: input.kind },
    });
    if (input.extraction) {
      await tx.insert(extractionRuns).values({
        organizationId: actor.organizationId,
        sourceId: source.id,
        provider: input.extraction.provider,
        mode: input.extraction.mode,
        status: input.extraction.status,
        resultJson: input.extraction.result,
      });
      await appendAuditEvent(tx, actor, {
        eventType: "EXTRACTION_PERFORMED",
        subjectType: "OBLIGATION_SOURCE",
        subjectId: source.id,
        payload: {
          mode: input.extraction.mode,
          provider: input.extraction.provider,
        },
      });
    }
    return source;
  });
}

export async function getSourceReview(
  db: Executor,
  organizationId: string,
  sourceId: string,
) {
  const rows = await db
    .select({ source: obligationSources, extraction: extractionRuns })
    .from(obligationSources)
    .leftJoin(
      extractionRuns,
      and(
        eq(extractionRuns.organizationId, organizationId),
        eq(extractionRuns.sourceId, obligationSources.id),
      ),
    )
    .where(
      and(
        eq(obligationSources.organizationId, organizationId),
        eq(obligationSources.id, sourceId),
      ),
    )
    .orderBy(desc(extractionRuns.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export class ExactDuplicateError extends Error {
  constructor(readonly candidateId: string) {
    super("An exact duplicate obligation already exists");
    this.name = "ExactDuplicateError";
  }
}

export async function createObligation(
  db: Database,
  actor: TenantActor,
  input: unknown,
) {
  const value = validateObligationInput(input);
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${actor.organizationId}))`,
    );
    await requireWriteRole(tx, actor, financeWriteRoles);
    const vendor = await getVendor(tx, actor.organizationId, value.vendorId);
    if (!vendor) throw new Error("Vendor is unavailable in this organization");
    let sourceHash: string | null = null;
    let sourceId = value.sourceId;
    if (value.sourceId) {
      const source = await getSourceReview(
        tx,
        actor.organizationId,
        value.sourceId,
      );
      if (!source)
        throw new Error("Source is unavailable in this organization");
      sourceHash = source.source.contentHash;
    }
    const candidates = await tx
      .select({
        id: obligations.id,
        vendorId: obligations.vendorId,
        reference: obligations.reference,
        currency: obligations.currency,
        amountMinor: obligations.amountMinor,
        sourceHash: obligationSources.contentHash,
      })
      .from(obligations)
      .leftJoin(
        obligationSources,
        and(
          eq(obligationSources.organizationId, actor.organizationId),
          eq(obligationSources.id, obligations.sourceId),
        ),
      )
      .where(eq(obligations.organizationId, actor.organizationId));
    const findings = candidates.map((candidate) => ({
      candidate,
      finding: classifyDuplicate(
        {
          vendorId: value.vendorId,
          reference: value.reference,
          currency: value.currency,
          amountMinor: value.amountMinor,
          sourceHash,
        },
        candidate,
      ),
    }));
    const exact = findings.find(({ finding }) => finding.kind === "EXACT");
    if (exact) {
      await appendAuditEvent(tx, actor, {
        eventType: "DUPLICATE_DETECTED",
        subjectType: "OBLIGATION",
        subjectId: exact.candidate.id,
        payload: {
          kind: "EXACT",
          reasons: exact.finding.reasons,
          creationBlocked: true,
        },
      });
      return { exactCandidateId: exact.candidate.id };
    }
    if (!sourceId) {
      const [manualSource] = await tx
        .insert(obligationSources)
        .values({
          organizationId: actor.organizationId,
          kind: "MANUAL",
          metadataJson: { entry: "human" },
        })
        .returning();
      if (!manualSource)
        throw new Error("Manual source insert did not return a record");
      sourceId = manualSource.id;
      await appendAuditEvent(tx, actor, {
        eventType: "SOURCE_CREATED",
        subjectType: "OBLIGATION_SOURCE",
        subjectId: manualSource.id,
        payload: { kind: "MANUAL" },
      });
    }
    const [obligation] = await tx
      .insert(obligations)
      .values({
        organizationId: actor.organizationId,
        vendorId: value.vendorId,
        type: value.type,
        sourceId,
        reference: value.reference,
        currency: value.currency,
        amountMinor: value.amountMinor,
        dueAt: new Date(`${value.dueDate}T12:00:00.000Z`),
        category: value.category,
        description: value.description,
        state: "UNDER_REVIEW",
        createdBy: actor.userId,
      })
      .returning();
    if (!obligation)
      throw new Error("Obligation insert did not return a record");
    await tx.insert(obligationVersions).values({
      organizationId: actor.organizationId,
      obligationId: obligation.id,
      version: obligation.version,
      vendorId: obligation.vendorId,
      type: obligation.type,
      reference: obligation.reference,
      currency: obligation.currency,
      amountMinor: obligation.amountMinor,
      dueAt: obligation.dueAt,
      category: obligation.category,
      description: obligation.description,
      sourceId: obligation.sourceId,
      changedBy: actor.userId,
    });
    await appendAuditEvent(tx, actor, {
      eventType: "OBLIGATION_CREATED",
      subjectType: "OBLIGATION",
      subjectId: obligation.id,
      payload: {
        amountMinor: value.amountMinor.toString(),
        currency: value.currency,
      },
    });
    for (const { candidate, finding } of findings) {
      if (finding.kind !== "POSSIBLE") continue;
      await tx.insert(duplicateFindings).values({
        organizationId: actor.organizationId,
        obligationId: obligation.id,
        candidateObligationId: candidate.id,
        kind: "POSSIBLE",
        reasonsJson: finding.reasons,
      });
      await appendAuditEvent(tx, actor, {
        eventType: "DUPLICATE_DETECTED",
        subjectType: "OBLIGATION",
        subjectId: obligation.id,
        payload: {
          candidateId: candidate.id,
          kind: "POSSIBLE",
          reasons: finding.reasons,
        },
      });
    }
    await appendAuditEvent(tx, actor, {
      eventType: "OBLIGATION_REVIEW_CONFIRMED",
      subjectType: "OBLIGATION",
      subjectId: obligation.id,
      payload: { state: "UNDER_REVIEW" },
    });
    return { obligation };
  });
  if ("exactCandidateId" in result)
    throw new ExactDuplicateError(result.exactCandidateId);
  return result.obligation;
}

export async function updateObligation(
  db: Database,
  actor: TenantActor,
  obligationId: string,
  input: unknown,
) {
  const value = validateObligationInput(input);
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${actor.organizationId}))`,
    );
    await requireWriteRole(tx, actor, financeWriteRoles);
    const existingRows = await tx
      .select()
      .from(obligations)
      .where(
        and(
          eq(obligations.organizationId, actor.organizationId),
          eq(obligations.id, obligationId),
        ),
      )
      .limit(1);
    const existing = existingRows[0];
    if (!existing) return null;
    if (
      [
        "BROADCAST",
        "CONFIRMING",
        "SETTLED",
        "RECONCILIATION_EXCEPTION",
      ].includes(existing.state)
    )
      throw new Error(
        "An obligation cannot be edited after transaction broadcast",
      );
    if (!(await getVendor(tx, actor.organizationId, value.vendorId)))
      throw new Error("Vendor is unavailable in this organization");
    let sourceHash: string | null = null;
    if (existing.sourceId) {
      const source = await getSourceReview(
        tx,
        actor.organizationId,
        existing.sourceId,
      );
      if (!source)
        throw new Error("Source is unavailable in this organization");
      sourceHash = source.source.contentHash;
    }
    const candidates = await tx
      .select({
        id: obligations.id,
        vendorId: obligations.vendorId,
        reference: obligations.reference,
        currency: obligations.currency,
        amountMinor: obligations.amountMinor,
        sourceHash: obligationSources.contentHash,
      })
      .from(obligations)
      .leftJoin(
        obligationSources,
        and(
          eq(obligationSources.organizationId, actor.organizationId),
          eq(obligationSources.id, obligations.sourceId),
        ),
      )
      .where(
        and(
          eq(obligations.organizationId, actor.organizationId),
          ne(obligations.id, obligationId),
        ),
      );
    const findings = candidates.map((candidate) => ({
      candidate,
      finding: classifyDuplicate(
        {
          vendorId: value.vendorId,
          reference: value.reference,
          currency: value.currency,
          amountMinor: value.amountMinor,
          sourceHash,
        },
        candidate,
      ),
    }));
    const exact = findings.find(({ finding }) => finding.kind === "EXACT");
    if (exact) throw new ExactDuplicateError(exact.candidate.id);
    const [updated] = await tx
      .update(obligations)
      .set({
        vendorId: value.vendorId,
        type: value.type,
        reference: value.reference,
        currency: value.currency,
        amountMinor: value.amountMinor,
        dueAt: new Date(`${value.dueDate}T12:00:00.000Z`),
        category: value.category,
        description: value.description,
        version: existing.version + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(obligations.organizationId, actor.organizationId),
          eq(obligations.id, obligationId),
        ),
      )
      .returning();
    if (!updated) return null;
    const invalidatedIntents = await tx
      .update(settlementIntents)
      .set({
        state: "INVALIDATED",
        invalidatedAt: new Date(),
        invalidationReason: "Material obligation fields changed",
      })
      .where(
        and(
          eq(settlementIntents.organizationId, actor.organizationId),
          eq(settlementIntents.obligationId, obligationId),
          sql`${settlementIntents.invalidatedAt} is null`,
        ),
      )
      .returning({ id: settlementIntents.id });
    await tx
      .update(settlements)
      .set({ state: "INVALIDATED", errorCode: "OBLIGATION_CHANGED" })
      .where(
        and(
          eq(settlements.organizationId, actor.organizationId),
          eq(settlements.obligationId, obligationId),
          sql`${settlements.state} not in ('SETTLED','INVALIDATED')`,
        ),
      );
    await tx.insert(obligationVersions).values({
      organizationId: actor.organizationId,
      obligationId: updated.id,
      version: updated.version,
      vendorId: updated.vendorId,
      type: updated.type,
      reference: updated.reference,
      currency: updated.currency,
      amountMinor: updated.amountMinor,
      dueAt: updated.dueAt,
      category: updated.category,
      description: updated.description,
      sourceId: updated.sourceId,
      changedBy: actor.userId,
    });
    const invalidated = await tx
      .update(approvals)
      .set({
        invalidatedAt: new Date(),
        invalidationReason: "Material obligation fields changed",
      })
      .where(
        and(
          eq(approvals.organizationId, actor.organizationId),
          eq(approvals.obligationId, obligationId),
          sql`${approvals.invalidatedAt} is null`,
        ),
      )
      .returning({ id: approvals.id });
    await tx
      .update(approvalRequirements)
      .set({ state: "INVALIDATED" })
      .where(
        and(
          eq(approvalRequirements.organizationId, actor.organizationId),
          eq(approvalRequirements.obligationId, obligationId),
          ne(approvalRequirements.state, "INVALIDATED"),
        ),
      );
    for (const intent of invalidatedIntents)
      await appendAuditEvent(tx, actor, {
        eventType: "SETTLEMENT_INTENT_INVALIDATED",
        subjectType: "SETTLEMENT_INTENT",
        subjectId: intent.id,
        payload: { obligationId, reason: "Material obligation fields changed" },
      });
    await tx
      .update(obligations)
      .set({ state: "UNDER_REVIEW", destinationId: null })
      .where(
        and(
          eq(obligations.organizationId, actor.organizationId),
          eq(obligations.id, obligationId),
        ),
      );
    for (const approval of invalidated)
      await appendAuditEvent(tx, actor, {
        eventType: "APPROVAL_INVALIDATED",
        subjectType: "APPROVAL",
        subjectId: approval.id,
        payload: { obligationId, reason: "Material obligation fields changed" },
      });
    await tx
      .delete(duplicateFindings)
      .where(
        and(
          eq(duplicateFindings.organizationId, actor.organizationId),
          eq(duplicateFindings.obligationId, obligationId),
        ),
      );
    for (const { candidate, finding } of findings) {
      if (finding.kind !== "POSSIBLE") continue;
      await tx.insert(duplicateFindings).values({
        organizationId: actor.organizationId,
        obligationId,
        candidateObligationId: candidate.id,
        kind: "POSSIBLE",
        reasonsJson: finding.reasons,
      });
    }
    await appendAuditEvent(tx, actor, {
      eventType: "OBLIGATION_EDITED",
      subjectType: "OBLIGATION",
      subjectId: obligationId,
      payload: { version: updated.version },
    });
    return updated;
  });
}

export interface ObligationFilters {
  search?: string;
  state?: string;
  vendorId?: string;
}

export function listObligations(
  db: Executor,
  organizationId: string,
  filters: ObligationFilters = {},
) {
  const predicates = [eq(obligations.organizationId, organizationId)];
  if (filters.state)
    predicates.push(
      eq(
        obligations.state,
        filters.state as (typeof obligations.state.enumValues)[number],
      ),
    );
  if (filters.vendorId)
    predicates.push(eq(obligations.vendorId, filters.vendorId));
  if (filters.search)
    predicates.push(
      or(
        ilike(obligations.reference, `%${filters.search}%`),
        ilike(obligations.description, `%${filters.search}%`),
        ilike(vendors.displayName, `%${filters.search}%`),
      )!,
    );
  return db
    .select({ obligation: obligations, vendor: vendors })
    .from(obligations)
    .leftJoin(
      vendors,
      and(
        eq(vendors.organizationId, organizationId),
        eq(vendors.id, obligations.vendorId),
      ),
    )
    .where(and(...predicates))
    .orderBy(asc(obligations.dueAt), desc(obligations.createdAt))
    .limit(100);
}

export async function getObligation(
  db: Executor,
  organizationId: string,
  obligationId: string,
) {
  const rows = await db
    .select({
      obligation: obligations,
      vendor: vendors,
      source: obligationSources,
    })
    .from(obligations)
    .leftJoin(
      vendors,
      and(
        eq(vendors.organizationId, organizationId),
        eq(vendors.id, obligations.vendorId),
      ),
    )
    .leftJoin(
      obligationSources,
      and(
        eq(obligationSources.organizationId, organizationId),
        eq(obligationSources.id, obligations.sourceId),
      ),
    )
    .where(
      and(
        eq(obligations.organizationId, organizationId),
        eq(obligations.id, obligationId),
      ),
    )
    .limit(1);
  if (!rows[0]) return null;
  const [duplicates, activity] = await Promise.all([
    db
      .select()
      .from(duplicateFindings)
      .where(
        and(
          eq(duplicateFindings.organizationId, organizationId),
          eq(duplicateFindings.obligationId, obligationId),
        ),
      ),
    db
      .select()
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.organizationId, organizationId),
          or(
            eq(auditEvents.subjectId, obligationId),
            sql`${auditEvents.payloadJson}->>'obligationId' = ${obligationId}`,
          ),
        ),
      )
      .orderBy(desc(auditEvents.createdAt)),
  ]);
  return { ...rows[0], duplicates, activity };
}

export async function getDashboardMetrics(
  db: Executor,
  organizationId: string,
) {
  const rows = await db
    .select({
      openCount: sql<number>`count(*)::int`,
      dueSoon: sql<number>`count(*) filter (where ${obligations.dueAt} >= now() and ${obligations.dueAt} <= now() + interval '14 days')::int`,
      awaitingReview: sql<number>`count(*) filter (where ${obligations.state} = 'UNDER_REVIEW')::int`,
      awaitingApproval: sql<number>`count(*) filter (where ${obligations.state} = 'APPROVAL_REQUIRED')::int`,
      blocked: sql<number>`count(*) filter (where ${obligations.state} = 'BLOCKED')::int`,
      readyToSettle: sql<number>`count(*) filter (where ${obligations.state} = 'READY_TO_SETTLE')::int`,
    })
    .from(obligations)
    .where(eq(obligations.organizationId, organizationId));
  const possible = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(duplicateFindings)
    .where(
      and(
        eq(duplicateFindings.organizationId, organizationId),
        eq(duplicateFindings.resolutionStatus, "OPEN"),
      ),
    );
  const totals = await db
    .select({
      currency: obligations.currency,
      amountMinor: sql<bigint>`sum(${obligations.amountMinor})::bigint`,
    })
    .from(obligations)
    .where(eq(obligations.organizationId, organizationId))
    .groupBy(obligations.currency)
    .orderBy(asc(obligations.currency));
  return { ...rows[0], totals, possibleDuplicates: possible[0]?.count ?? 0 };
}

export * from "./control";
export * from "./evidence";
export * from "./hardening";
export * from "./reconciliation";
export * from "./settlement";
