import {
  defaultPolicyConfig,
  evaluatePolicy,
  evaluateReadiness,
  policyConfigSchema,
} from "@obliq/policy";
import { and, asc, desc, eq, ne, or, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { createDatabase } from "../index";
import {
  approvalRequirements,
  approvals,
  auditEvents,
  controlFindings,
  duplicateFindings,
  memberships,
  obligationVersions,
  obligations,
  policies,
  policyDecisions,
  policyVersions,
  settlementReadiness,
  users,
  vendorDestinations,
} from "../schema";
import { appendAuditEvent, type TenantActor } from "./index";

type Database = ReturnType<typeof createDatabase>["db"];
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type MembershipRole = (typeof memberships.role.enumValues)[number];
const policyAdmins: readonly MembershipRole[] = [
  "OWNER",
  "CFO",
  "POLICY_ADMIN",
];
const controlOperators: readonly MembershipRole[] = ["OWNER", "CFO", "FINANCE"];
const destinationVerifiers: readonly MembershipRole[] = [
  "OWNER",
  "CFO",
  "TREASURY",
];

async function actorRole(tx: Database | Transaction, actor: TenantActor) {
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
  if (!rows[0]) throw new Error("No active organization membership");
  return rows[0].role;
}
function requireRole(
  actual: MembershipRole,
  allowed: readonly MembershipRole[],
  action: string,
) {
  if (!allowed.includes(actual))
    throw new Error(`Role ${actual} cannot ${action}`);
}
async function lock(tx: Transaction, organizationId: string) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${organizationId}))`,
  );
}

export async function createDefaultPolicy(
  db: Database,
  actor: TenantActor,
  name = "Accounts payable controls",
) {
  return db.transaction(async (tx) => {
    await lock(tx, actor.organizationId);
    requireRole(
      await actorRole(tx, actor),
      policyAdmins,
      "administer policies",
    );
    const existing = await tx
      .select()
      .from(policies)
      .where(
        and(
          eq(policies.organizationId, actor.organizationId),
          eq(policies.enabled, true),
        ),
      )
      .limit(1);
    if (existing[0]) return existing[0];
    const [policy] = await tx
      .insert(policies)
      .values({
        organizationId: actor.organizationId,
        name,
        enabled: true,
        activeVersion: 1,
        createdBy: actor.userId,
      })
      .returning();
    if (!policy) throw new Error("Policy insert failed");
    const [version] = await tx
      .insert(policyVersions)
      .values({
        organizationId: actor.organizationId,
        policyId: policy.id,
        version: 1,
        configJson: defaultPolicyConfig,
        createdBy: actor.userId,
      })
      .returning();
    if (!version) throw new Error("Policy version insert failed");
    await appendAuditEvent(tx, actor, {
      eventType: "POLICY_CREATED",
      subjectType: "POLICY",
      subjectId: policy.id,
      payload: { version: 1 },
    });
    await appendAuditEvent(tx, actor, {
      eventType: "POLICY_VERSION_CREATED",
      subjectType: "POLICY_VERSION",
      subjectId: version.id,
      payload: { policyId: policy.id, version: 1 },
    });
    return policy;
  });
}
export async function createPolicyVersion(
  db: Database,
  actor: TenantActor,
  policyId: string,
  config: unknown,
) {
  const parsed = policyConfigSchema.parse(config);
  return db.transaction(async (tx) => {
    await lock(tx, actor.organizationId);
    requireRole(
      await actorRole(tx, actor),
      policyAdmins,
      "administer policies",
    );
    const rows = await tx
      .select()
      .from(policies)
      .where(
        and(
          eq(policies.organizationId, actor.organizationId),
          eq(policies.id, policyId),
        ),
      )
      .limit(1);
    const policy = rows[0];
    if (!policy) return null;
    const next = policy.activeVersion + 1;
    const [version] = await tx
      .insert(policyVersions)
      .values({
        organizationId: actor.organizationId,
        policyId,
        version: next,
        configJson: parsed,
        createdBy: actor.userId,
      })
      .returning();
    await tx
      .update(policies)
      .set({ activeVersion: next })
      .where(
        and(
          eq(policies.organizationId, actor.organizationId),
          eq(policies.id, policyId),
        ),
      );
    if (!version) throw new Error("Policy version insert failed");
    const impacted = await tx
      .select({ id: obligations.id })
      .from(obligations)
      .where(
        and(
          eq(obligations.organizationId, actor.organizationId),
          sql`${obligations.state} in ('BLOCKED','APPROVAL_REQUIRED','APPROVED','READY_TO_SETTLE')`,
        ),
      );
    for (const obligation of impacted) {
      await invalidateCurrent(
        tx,
        actor,
        obligation.id,
        "Active policy version changed",
      );
      await tx
        .update(obligations)
        .set({ state: "UNDER_REVIEW", updatedAt: new Date() })
        .where(
          and(
            eq(obligations.organizationId, actor.organizationId),
            eq(obligations.id, obligation.id),
          ),
        );
      await appendAuditEvent(tx, actor, {
        eventType: "AUTHORIZATION_RESET",
        subjectType: "OBLIGATION",
        subjectId: obligation.id,
        payload: {
          reason: "Active policy version changed",
          policyVersionId: version.id,
        },
      });
    }
    await appendAuditEvent(tx, actor, {
      eventType: "POLICY_VERSION_CREATED",
      subjectType: "POLICY_VERSION",
      subjectId: version.id,
      payload: { policyId, version: next },
    });
    return version;
  });
}
export async function listPolicies(db: Database, organizationId: string) {
  return db
    .select({ policy: policies, version: policyVersions })
    .from(policies)
    .leftJoin(
      policyVersions,
      and(
        eq(policyVersions.organizationId, organizationId),
        eq(policyVersions.policyId, policies.id),
        eq(policyVersions.version, policies.activeVersion),
      ),
    )
    .where(eq(policies.organizationId, organizationId))
    .orderBy(asc(policies.createdAt))
    .limit(100);
}
export async function listPolicyVersions(
  db: Database,
  organizationId: string,
  policyId: string,
) {
  return db
    .select()
    .from(policyVersions)
    .where(
      and(
        eq(policyVersions.organizationId, organizationId),
        eq(policyVersions.policyId, policyId),
      ),
    )
    .orderBy(desc(policyVersions.version));
}

async function invalidateCurrent(
  tx: Transaction,
  actor: TenantActor,
  obligationId: string,
  reason: string,
) {
  const now = new Date();
  const changed = await tx
    .update(approvals)
    .set({ invalidatedAt: now, invalidationReason: reason })
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
  for (const approval of changed)
    await appendAuditEvent(tx, actor, {
      eventType: "APPROVAL_INVALIDATED",
      subjectType: "APPROVAL",
      subjectId: approval.id,
      payload: { obligationId, reason },
    });
}
export async function invalidateObligationAuthorization(
  tx: Transaction,
  actor: TenantActor,
  obligationId: string,
  reason: string,
) {
  await invalidateCurrent(tx, actor, obligationId, reason);
  await tx
    .update(obligations)
    .set({ state: "UNDER_REVIEW" })
    .where(
      and(
        eq(obligations.organizationId, actor.organizationId),
        eq(obligations.id, obligationId),
      ),
    );
}

export async function evaluateObligationControls(
  db: Database,
  actor: TenantActor,
  obligationId: string,
) {
  return db.transaction(async (tx) => {
    await lock(tx, actor.organizationId);
    requireRole(
      await actorRole(tx, actor),
      controlOperators,
      "evaluate controls",
    );
    const obligationRows = await tx
      .select()
      .from(obligations)
      .where(
        and(
          eq(obligations.organizationId, actor.organizationId),
          eq(obligations.id, obligationId),
        ),
      )
      .limit(1);
    const obligation = obligationRows[0];
    if (!obligation) return null;
    const snapshotRows = await tx
      .select()
      .from(obligationVersions)
      .where(
        and(
          eq(obligationVersions.organizationId, actor.organizationId),
          eq(obligationVersions.obligationId, obligation.id),
          eq(obligationVersions.version, obligation.version),
        ),
      )
      .limit(1);
    const snapshot = snapshotRows[0];
    if (!snapshot) throw new Error("Current obligation version is unavailable");
    if (
      ![
        "UNDER_REVIEW",
        "BLOCKED",
        "APPROVAL_REQUIRED",
        "APPROVED",
        "READY_TO_SETTLE",
      ].includes(obligation.state)
    )
      throw new Error("Obligation cannot enter control evaluation");
    const policyRows = await tx
      .select({ policy: policies, version: policyVersions })
      .from(policies)
      .innerJoin(
        policyVersions,
        and(
          eq(policyVersions.policyId, policies.id),
          eq(policyVersions.organizationId, actor.organizationId),
          eq(policyVersions.version, policies.activeVersion),
        ),
      )
      .where(
        and(
          eq(policies.organizationId, actor.organizationId),
          eq(policies.enabled, true),
        ),
      )
      .limit(1);
    const active = policyRows[0];
    if (!active) throw new Error("No active policy is configured");
    const destinations = await tx
      .select()
      .from(vendorDestinations)
      .where(
        and(
          eq(vendorDestinations.organizationId, actor.organizationId),
          eq(vendorDestinations.vendorId, obligation.vendorId),
          ne(vendorDestinations.verificationStatus, "SUPERSEDED"),
        ),
      )
      .orderBy(desc(vendorDestinations.createdAt))
      .limit(1);
    const destination = destinations[0] ?? null;
    const prior = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(obligations)
      .where(
        and(
          eq(obligations.organizationId, actor.organizationId),
          eq(obligations.vendorId, obligation.vendorId),
          ne(obligations.id, obligation.id),
        ),
      );
    const duplicateRows = await tx
      .select()
      .from(duplicateFindings)
      .where(
        and(
          eq(duplicateFindings.organizationId, actor.organizationId),
          eq(duplicateFindings.obligationId, obligation.id),
          eq(duplicateFindings.resolutionStatus, "OPEN"),
        ),
      );
    const policyInput = {
      amountMinor: obligation.amountMinor,
      currency: obligation.currency,
      vendorKnown: (prior[0]?.count ?? 0) > 0,
      destinationStatus: destination
        ? destination.verificationStatus === "VERIFIED_MANUALLY"
          ? "VERIFIED_MANUALLY"
          : destination.verificationStatus === "SUPERSEDED"
            ? "SUPERSEDED"
            : "UNVERIFIED"
        : "NONE",
      duplicateStatus: duplicateRows.length ? "POSSIBLE_OPEN" : "CLEAR",
      fieldsComplete: Boolean(
        obligation.reference && obligation.description && obligation.dueAt,
      ),
    } as const;
    const result = evaluatePolicy(active.version.configJson, policyInput);
    await invalidateCurrent(
      tx,
      actor,
      obligation.id,
      "Fresh policy evaluation",
    );
    const inputHash = createHash("sha256")
      .update(
        JSON.stringify({
          obligationVersion: obligation.version,
          vendorId: snapshot.vendorId,
          obligationType: snapshot.type,
          reference: snapshot.reference,
          dueAt: snapshot.dueAt?.toISOString() ?? null,
          category: snapshot.category,
          description: snapshot.description,
          policyVersionId: active.version.id,
          destinationId: destination?.id ?? null,
          amountMinor: obligation.amountMinor.toString(),
          currency: obligation.currency,
          vendorKnown: policyInput.vendorKnown,
          destinationStatus: policyInput.destinationStatus,
          duplicateStatus: policyInput.duplicateStatus,
          fieldsComplete: policyInput.fieldsComplete,
          duplicateIds: duplicateRows.map((item) => item.id).sort(),
        }),
      )
      .digest("hex");
    const [decision] = await tx
      .insert(policyDecisions)
      .values({
        organizationId: actor.organizationId,
        obligationId: obligation.id,
        policyVersionId: active.version.id,
        obligationVersion: obligation.version,
        destinationId: destination?.id,
        result: result.result,
        inputHash,
      })
      .returning();
    if (!decision) throw new Error("Policy decision insert failed");
    if (result.findings.length)
      await tx.insert(controlFindings).values(
        result.findings.map((finding) => ({
          organizationId: actor.organizationId,
          policyDecisionId: decision.id,
          obligationId: obligation.id,
          code: finding.code,
          outcome: finding.outcome,
          message: finding.message,
          metadataJson: finding.metadata ?? {},
        })),
      );
    if (result.requirements.length)
      await tx.insert(approvalRequirements).values(
        result.requirements.map((requirement) => ({
          organizationId: actor.organizationId,
          obligationId: obligation.id,
          policyDecisionId: decision.id,
          obligationVersion: obligation.version,
          role: requirement.role,
          requiredCount: requirement.count,
          prohibitCreator: requirement.prohibitCreator,
          reason: requirement.reason,
          state: "PENDING" as const,
        })),
      );
    await tx
      .update(obligations)
      .set({
        state: result.result,
        destinationId: destination?.id,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(obligations.organizationId, actor.organizationId),
          eq(obligations.id, obligation.id),
        ),
      );
    await appendAuditEvent(tx, actor, {
      eventType: "POLICY_EVALUATED",
      subjectType: "OBLIGATION",
      subjectId: obligation.id,
      payload: {
        policyVersionId: active.version.id,
        obligationVersion: obligation.version,
        result: result.result,
        findingCodes: result.findings.map((finding) => finding.code),
      },
    });
    for (const finding of result.findings)
      await appendAuditEvent(tx, actor, {
        eventType: "CONTROL_FINDING_RECORDED",
        subjectType: "OBLIGATION",
        subjectId: obligation.id,
        payload: {
          policyDecisionId: decision.id,
          code: finding.code,
          outcome: finding.outcome,
        },
      });
    for (const requirement of result.requirements)
      await appendAuditEvent(tx, actor, {
        eventType: "APPROVAL_REQUESTED",
        subjectType: "OBLIGATION",
        subjectId: obligation.id,
        payload: {
          policyDecisionId: decision.id,
          role: requirement.role,
          count: requirement.count,
        },
      });
    return decision;
  });
}

export async function verifyDestinationManually(
  db: Database,
  actor: TenantActor,
  destinationId: string,
  method: string,
  note: string,
) {
  if (method.trim().length < 3 || note.trim().length < 3)
    throw new Error("Verification method and note are required");
  return db.transaction(async (tx) => {
    await lock(tx, actor.organizationId);
    requireRole(
      await actorRole(tx, actor),
      destinationVerifiers,
      "verify destinations",
    );
    const [destination] = await tx
      .update(vendorDestinations)
      .set({
        verificationStatus: "VERIFIED_MANUALLY",
        verifiedAt: new Date(),
        verifiedBy: actor.userId,
        verificationMethod: method.trim(),
        verificationNote: note.trim(),
      })
      .where(
        and(
          eq(vendorDestinations.organizationId, actor.organizationId),
          eq(vendorDestinations.id, destinationId),
          eq(vendorDestinations.verificationStatus, "UNVERIFIED"),
        ),
      )
      .returning();
    if (!destination) return null;
    await appendAuditEvent(tx, actor, {
      eventType: "DESTINATION_VERIFIED",
      subjectType: "VENDOR_DESTINATION",
      subjectId: destination.id,
      payload: { method: method.trim(), vendorId: destination.vendorId },
    });
    return destination;
  });
}

function eligibleFor(role: MembershipRole, requirement: string) {
  return (
    role === "OWNER" ||
    role === requirement ||
    (role === "APPROVER" && requirement === "FINANCE")
  );
}
export async function decideApproval(
  db: Database,
  actor: TenantActor,
  requirementId: string,
  decisionValue: "APPROVE" | "REJECT",
  note?: string,
) {
  return db.transaction(async (tx) => {
    await lock(tx, actor.organizationId);
    const role = await actorRole(tx, actor);
    const rows = await tx
      .select({ requirement: approvalRequirements, obligation: obligations })
      .from(approvalRequirements)
      .innerJoin(
        obligations,
        and(
          eq(obligations.organizationId, actor.organizationId),
          eq(obligations.id, approvalRequirements.obligationId),
        ),
      )
      .where(
        and(
          eq(approvalRequirements.organizationId, actor.organizationId),
          eq(approvalRequirements.id, requirementId),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    if (
      row.requirement.state !== "PENDING" ||
      row.obligation.state !== "APPROVAL_REQUIRED"
    )
      throw new Error("Approval requirement is not actionable");
    if (row.requirement.obligationVersion !== row.obligation.version)
      throw new Error("Stale obligation version");
    if (!eligibleFor(role, row.requirement.role))
      throw new Error("Actor is not eligible for this approval role");
    if (
      row.requirement.prohibitCreator &&
      row.obligation.createdBy === actor.userId
    )
      throw new Error("Creator cannot satisfy this approval requirement");
    const [approval] = await tx
      .insert(approvals)
      .values({
        organizationId: actor.organizationId,
        obligationId: row.obligation.id,
        actorId: actor.userId,
        requirementId,
        policyDecisionId: row.requirement.policyDecisionId,
        decision: decisionValue,
        capacityRole: row.requirement.role,
        note,
        obligationVersion: row.obligation.version,
      })
      .returning();
    if (!approval) throw new Error("Approval insert failed");
    if (decisionValue === "REJECT") {
      await tx
        .update(approvalRequirements)
        .set({ state: "REJECTED" })
        .where(eq(approvalRequirements.id, requirementId));
      await tx
        .update(obligations)
        .set({ state: "REJECTED" })
        .where(
          and(
            eq(obligations.organizationId, actor.organizationId),
            eq(obligations.id, row.obligation.id),
          ),
        );
      await appendAuditEvent(tx, actor, {
        eventType: "APPROVAL_REJECTED",
        subjectType: "APPROVAL",
        subjectId: approval.id,
        payload: {
          obligationId: row.obligation.id,
          role: row.requirement.role,
        },
      });
      return approval;
    }
    const active = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(approvals)
      .where(
        and(
          eq(approvals.organizationId, actor.organizationId),
          eq(approvals.requirementId, requirementId),
          eq(approvals.decision, "APPROVE"),
          sql`${approvals.invalidatedAt} is null`,
        ),
      );
    const count = active[0]?.count ?? 0;
    const requirementState =
      count >= row.requirement.requiredCount ? "APPROVED" : "PENDING";
    await tx
      .update(approvalRequirements)
      .set({ approvedCount: count, state: requirementState })
      .where(
        and(
          eq(approvalRequirements.organizationId, actor.organizationId),
          eq(approvalRequirements.id, requirementId),
        ),
      );
    const pending = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(approvalRequirements)
      .where(
        and(
          eq(approvalRequirements.organizationId, actor.organizationId),
          eq(
            approvalRequirements.policyDecisionId,
            row.requirement.policyDecisionId,
          ),
          ne(approvalRequirements.state, "APPROVED"),
        ),
      );
    if ((pending[0]?.count ?? 0) === 0)
      await tx
        .update(obligations)
        .set({ state: "APPROVED", updatedAt: new Date() })
        .where(
          and(
            eq(obligations.organizationId, actor.organizationId),
            eq(obligations.id, row.obligation.id),
            eq(obligations.version, row.obligation.version),
          ),
        );
    await appendAuditEvent(tx, actor, {
      eventType: "APPROVAL_GRANTED",
      subjectType: "APPROVAL",
      subjectId: approval.id,
      payload: {
        obligationId: row.obligation.id,
        role: row.requirement.role,
        approvedCount: count,
        requiredCount: row.requirement.requiredCount,
      },
    });
    return approval;
  });
}

export async function evaluateSettlementReadiness(
  db: Database,
  actor: TenantActor,
  obligationId: string,
) {
  return db.transaction(async (tx) => {
    await lock(tx, actor.organizationId);
    requireRole(
      await actorRole(tx, actor),
      controlOperators,
      "evaluate settlement readiness",
    );
    const obligationRows = await tx
      .select()
      .from(obligations)
      .where(
        and(
          eq(obligations.organizationId, actor.organizationId),
          eq(obligations.id, obligationId),
        ),
      )
      .limit(1);
    const obligation = obligationRows[0];
    if (!obligation) return null;
    const decisionRows = await tx
      .select()
      .from(policyDecisions)
      .where(
        and(
          eq(policyDecisions.organizationId, actor.organizationId),
          eq(policyDecisions.obligationId, obligationId),
        ),
      )
      .orderBy(desc(policyDecisions.evaluatedAt))
      .limit(1);
    const decision = decisionRows[0];
    if (!decision) throw new Error("No policy decision exists");
    const versionRows = await tx
      .select({ version: policyVersions, policy: policies })
      .from(policyVersions)
      .innerJoin(
        policies,
        and(
          eq(policies.organizationId, actor.organizationId),
          eq(policies.id, policyVersions.policyId),
        ),
      )
      .where(
        and(
          eq(policyVersions.organizationId, actor.organizationId),
          eq(policyVersions.id, decision.policyVersionId),
        ),
      )
      .limit(1);
    const policy = versionRows[0];
    if (!policy) throw new Error("Policy version is unavailable");
    const [findings, requirements, duplicates, destination] = await Promise.all(
      [
        tx
          .select()
          .from(controlFindings)
          .where(
            and(
              eq(controlFindings.organizationId, actor.organizationId),
              eq(controlFindings.policyDecisionId, decision.id),
            ),
          ),
        tx
          .select()
          .from(approvalRequirements)
          .where(
            and(
              eq(approvalRequirements.organizationId, actor.organizationId),
              eq(approvalRequirements.policyDecisionId, decision.id),
            ),
          ),
        tx
          .select()
          .from(duplicateFindings)
          .where(
            and(
              eq(duplicateFindings.organizationId, actor.organizationId),
              eq(duplicateFindings.obligationId, obligationId),
              eq(duplicateFindings.resolutionStatus, "OPEN"),
            ),
          ),
        decision.destinationId
          ? tx
              .select()
              .from(vendorDestinations)
              .where(
                and(
                  eq(vendorDestinations.organizationId, actor.organizationId),
                  eq(vendorDestinations.id, decision.destinationId),
                ),
              )
              .limit(1)
          : Promise.resolve([]),
      ],
    );
    const result = evaluateReadiness({
      obligationState: obligation.state,
      currentObligationVersion: obligation.version,
      decisionObligationVersion: decision.obligationVersion,
      currentPolicyVersionId:
        policy.policy.activeVersion === policy.version.version
          ? policy.version.id
          : "STALE",
      decisionPolicyVersionId: decision.policyVersionId,
      currentDestinationId: obligation.destinationId,
      decisionDestinationId: decision.destinationId,
      decisionResult: decision.result,
      hasBlockingFindings: findings.some(
        (finding) => finding.outcome === "BLOCK",
      ),
      hasOpenDuplicates: duplicates.length > 0,
      destinationAcceptable:
        destination[0]?.verificationStatus === "VERIFIED_MANUALLY" &&
        !destination[0].supersededAt,
      requirements,
    });
    const [readiness] = await tx
      .insert(settlementReadiness)
      .values({
        organizationId: actor.organizationId,
        obligationId,
        obligationVersion: obligation.version,
        policyDecisionId: decision.id,
        destinationId: decision.destinationId,
        result: result.ready ? "READY" : "NOT_READY",
        reasonsJson: result.reasons,
        evaluatedBy: actor.userId,
      })
      .returning();
    if (!readiness) throw new Error("Readiness insert failed");
    await appendAuditEvent(tx, actor, {
      eventType: "READINESS_EVALUATED",
      subjectType: "OBLIGATION",
      subjectId: obligationId,
      payload: {
        result: readiness.result,
        reasonCodes: result.reasons.map((reason) => reason.code),
        obligationVersion: obligation.version,
      },
    });
    if (result.ready) {
      await tx
        .update(obligations)
        .set({ state: "READY_TO_SETTLE", updatedAt: new Date() })
        .where(
          and(
            eq(obligations.organizationId, actor.organizationId),
            eq(obligations.id, obligationId),
            eq(obligations.state, "APPROVED"),
          ),
        );
      await appendAuditEvent(tx, actor, {
        eventType: "OBLIGATION_READY_TO_SETTLE",
        subjectType: "OBLIGATION",
        subjectId: obligationId,
        payload: {
          obligationVersion: obligation.version,
          policyDecisionId: decision.id,
          destinationId: decision.destinationId,
        },
      });
    }
    return { readiness, ...result };
  });
}

export async function resolveDuplicateFinding(
  db: Database,
  actor: TenantActor,
  findingId: string,
  note: string,
) {
  if (note.trim().length < 3) throw new Error("Resolution note is required");
  return db.transaction(async (tx) => {
    await lock(tx, actor.organizationId);
    requireRole(
      await actorRole(tx, actor),
      controlOperators,
      "resolve duplicate findings",
    );
    const [finding] = await tx
      .update(duplicateFindings)
      .set({
        resolutionStatus: "RESOLVED",
        resolvedBy: actor.userId,
        resolvedAt: new Date(),
        resolutionNote: note.trim(),
      })
      .where(
        and(
          eq(duplicateFindings.organizationId, actor.organizationId),
          eq(duplicateFindings.id, findingId),
          eq(duplicateFindings.resolutionStatus, "OPEN"),
        ),
      )
      .returning();
    if (!finding) return null;
    await invalidateObligationAuthorization(
      tx,
      actor,
      finding.obligationId,
      "Duplicate finding resolved; reevaluation required",
    );
    await appendAuditEvent(tx, actor, {
      eventType: "DUPLICATE_RESOLVED",
      subjectType: "OBLIGATION",
      subjectId: finding.obligationId,
      payload: { findingId },
    });
    return finding;
  });
}

export async function getControlView(
  db: Database,
  organizationId: string,
  obligationId: string,
) {
  const decisions = await db
    .select()
    .from(policyDecisions)
    .where(
      and(
        eq(policyDecisions.organizationId, organizationId),
        eq(policyDecisions.obligationId, obligationId),
      ),
    )
    .orderBy(desc(policyDecisions.evaluatedAt))
    .limit(1);
  const decision = decisions[0];
  if (!decision)
    return {
      decision: null,
      findings: [],
      requirements: [],
      approvals: [],
      readiness: null,
    };
  const [findings, requirements, approvalRows, readinessRows] =
    await Promise.all([
      db
        .select()
        .from(controlFindings)
        .where(
          and(
            eq(controlFindings.organizationId, organizationId),
            eq(controlFindings.policyDecisionId, decision.id),
          ),
        ),
      db
        .select()
        .from(approvalRequirements)
        .where(
          and(
            eq(approvalRequirements.organizationId, organizationId),
            eq(approvalRequirements.policyDecisionId, decision.id),
          ),
        ),
      db
        .select({ approval: approvals, user: users })
        .from(approvals)
        .leftJoin(users, eq(users.id, approvals.actorId))
        .where(
          and(
            eq(approvals.organizationId, organizationId),
            eq(approvals.policyDecisionId, decision.id),
          ),
        )
        .orderBy(asc(approvals.createdAt)),
      db
        .select()
        .from(settlementReadiness)
        .where(
          and(
            eq(settlementReadiness.organizationId, organizationId),
            eq(settlementReadiness.obligationId, obligationId),
          ),
        )
        .orderBy(desc(settlementReadiness.evaluatedAt))
        .limit(1),
    ]);
  return {
    decision,
    findings,
    requirements,
    approvals: approvalRows,
    readiness: readinessRows[0] ?? null,
  };
}

export async function listApprovalInbox(db: Database, actor: TenantActor) {
  const role = await actorRole(db, actor);
  const eligibleRequirement =
    role === "OWNER"
      ? undefined
      : role === "APPROVER"
        ? eq(approvalRequirements.role, "FINANCE")
        : or(eq(approvalRequirements.role, role));
  const rows = await db
    .select({
      requirement: approvalRequirements,
      obligation: obligations,
      user: users,
    })
    .from(approvalRequirements)
    .innerJoin(
      obligations,
      and(
        eq(obligations.organizationId, actor.organizationId),
        eq(obligations.id, approvalRequirements.obligationId),
      ),
    )
    .leftJoin(users, eq(users.id, obligations.createdBy))
    .where(
      and(
        eq(approvalRequirements.organizationId, actor.organizationId),
        eq(approvalRequirements.state, "PENDING"),
        eq(obligations.state, "APPROVAL_REQUIRED"),
        eligibleRequirement,
        or(
          eq(approvalRequirements.prohibitCreator, false),
          ne(obligations.createdBy, actor.userId),
        ),
      ),
    )
    .orderBy(asc(obligations.dueAt))
    .limit(100);
  return rows;
}

export async function auditChainStatus(db: Database, organizationId: string) {
  const events = await db
    .select()
    .from(auditEvents)
    .where(eq(auditEvents.organizationId, organizationId))
    .orderBy(desc(auditEvents.chainSequence))
    .limit(1);
  return { eventCountPresent: Boolean(events[0]) };
}
