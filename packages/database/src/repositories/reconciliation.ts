import {
  memoReferenceHash,
  reconcileObservation,
  type NormalizedShieldedOutput,
  type ObserverStatus,
  type ObservationTarget,
} from "@obliq/zcash";
import { and, desc, eq, sql } from "drizzle-orm";
import type { createDatabase } from "../index";
import {
  obligations,
  settlementObservations,
  settlementObservationTargets,
  zcashObserverStatuses,
} from "../schema";
import {
  appendAuditEvent,
  requireActiveMembership,
  type TenantActor,
} from "./index";

type Database = ReturnType<typeof createDatabase>["db"];
const observerOperatorRoles = ["OWNER", "CFO", "TREASURY"] as const;

function requireObserverOperator(role: string) {
  if (!observerOperatorRoles.some((allowed) => allowed === role))
    throw new Error("Actor cannot operate shielded reconciliation");
}

export interface CreateObservationTargetInput extends ObservationTarget {
  obligationId: string;
}

export async function createObservationTarget(
  db: Database,
  actor: TenantActor,
  input: CreateObservationTargetInput,
) {
  if (input.expectedAmountZat <= 0n)
    throw new Error("Expected zatoshi amount must be positive");
  if (
    !Number.isInteger(input.requiredConfirmations) ||
    input.requiredConfirmations < 1
  )
    throw new Error("Required confirmations must be a positive integer");
  return db.transaction(async (tx) => {
    const membership = await requireActiveMembership(tx, actor);
    requireObserverOperator(membership.role);
    const rows = await tx
      .select({ id: obligations.id, state: obligations.state })
      .from(obligations)
      .where(
        and(
          eq(obligations.organizationId, actor.organizationId),
          eq(obligations.id, input.obligationId),
        ),
      )
      .limit(1);
    if (!rows[0]) return null;
    if (rows[0].state !== "READY_TO_SETTLE")
      throw new Error("Only READY_TO_SETTLE obligations may be observed");
    const [target] = await tx
      .insert(settlementObservationTargets)
      .values({ organizationId: actor.organizationId, ...input })
      .returning();
    if (!target) throw new Error("Observation target insert failed");
    await appendAuditEvent(tx, actor, {
      eventType: "RECONCILIATION_TARGET_CREATED",
      subjectType: "OBLIGATION",
      subjectId: input.obligationId,
      payload: {
        network: input.network,
        receiverFingerprint: input.receiverFingerprint,
        requiredConfirmations: input.requiredConfirmations,
      },
    });
    return target;
  });
}

export async function ingestShieldedObservation(
  db: Database,
  actor: TenantActor,
  observation: NormalizedShieldedOutput,
) {
  return db.transaction(async (tx) => {
    requireObserverOperator((await requireActiveMembership(tx, actor)).role);
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${actor.organizationId}))`,
    );
    const targets = await tx
      .select()
      .from(settlementObservationTargets)
      .where(
        and(
          eq(settlementObservationTargets.organizationId, actor.organizationId),
          eq(settlementObservationTargets.network, observation.network),
          eq(
            settlementObservationTargets.receiverFingerprint,
            observation.receiverFingerprint,
          ),
        ),
      )
      .limit(1);
    const target = targets[0];
    if (!target)
      return { outcome: "UNMATCHED" as const, reason: "UNKNOWN_RECEIVER" };

    const result = reconcileObservation(
      { ...target, network: observation.network },
      observation,
    );
    const existing = await tx
      .select()
      .from(settlementObservations)
      .where(
        and(
          eq(settlementObservations.organizationId, actor.organizationId),
          eq(settlementObservations.network, observation.network),
          eq(settlementObservations.txid, observation.txid),
          eq(settlementObservations.pool, observation.pool),
          eq(settlementObservations.outputIndex, observation.outputIndex),
        ),
      )
      .limit(1);
    const memoHash = observation.memoReference
      ? memoReferenceHash(observation.memoReference)
      : null;
    if (
      existing[0] &&
      (existing[0].pool !== observation.pool ||
        existing[0].observedAmountZat !== observation.amountZat ||
        existing[0].receiverFingerprint !== observation.receiverFingerprint ||
        existing[0].memoReferenceHash !== memoHash)
    )
      throw new Error("Conflicting data for an existing shielded output");
    const [stored] = await tx
      .insert(settlementObservations)
      .values({
        organizationId: actor.organizationId,
        obligationId: target.obligationId,
        targetId: target.id,
        network: observation.network,
        txid: observation.txid,
        outputIndex: observation.outputIndex,
        pool: observation.pool,
        observerSource: observation.observerSource,
        blockHeight: BigInt(observation.minedHeight),
        confirmations: observation.confirmations,
        observedAmountZat: observation.amountZat,
        memoReferenceHash: memoHash,
        receiverFingerprint: observation.receiverFingerprint,
        correlationStatus: result.correlation,
        state: result.state,
        reasonsJson: result.reasons,
        observedAt: observation.observedAt,
        evidenceJson: {
          observerSource: observation.observerSource,
          pool: observation.pool,
        },
      })
      .onConflictDoUpdate({
        target: [
          settlementObservations.organizationId,
          settlementObservations.network,
          settlementObservations.txid,
          settlementObservations.pool,
          settlementObservations.outputIndex,
        ],
        set: {
          blockHeight: BigInt(observation.minedHeight),
          confirmations: observation.confirmations,
          correlationStatus: result.correlation,
          state: result.state,
          reasonsJson: result.reasons,
          observedAt: observation.observedAt,
        },
      })
      .returning();
    if (!stored) throw new Error("Observation upsert failed");
    const changed =
      !existing[0] ||
      existing[0].confirmations !== stored.confirmations ||
      existing[0].state !== stored.state;
    if (changed) {
      await appendAuditEvent(tx, actor, {
        eventType:
          stored.state === "SETTLED" && existing[0]?.state !== "SETTLED"
            ? "SETTLEMENT_RECONCILED"
            : stored.state === "MISMATCH"
              ? "RECONCILIATION_MISMATCH"
              : existing[0]
                ? "SETTLEMENT_CONFIRMATION_UPDATED"
                : "SETTLEMENT_DETECTED",
        subjectType: "SETTLEMENT_OBSERVATION",
        subjectId: stored.id,
        payload: {
          obligationId: target.obligationId,
          network: stored.network,
          txid: stored.txid,
          outputIndex: stored.outputIndex,
          confirmations: stored.confirmations,
          correlationStatus: stored.correlationStatus,
          state: stored.state,
        },
      });
    }
    return { outcome: "STORED" as const, observation: stored, changed };
  });
}

export async function recordObserverStatus(
  db: Database,
  actor: TenantActor,
  status: ObserverStatus,
) {
  requireObserverOperator((await requireActiveMembership(db, actor)).role);
  const [stored] = await db
    .insert(zcashObserverStatuses)
    .values({
      organizationId: actor.organizationId,
      network: status.network,
      availability: status.availability,
      chainTipHeight:
        status.chainTipHeight === undefined
          ? null
          : BigInt(status.chainTipHeight),
      fullyScannedHeight:
        status.fullyScannedHeight === undefined
          ? null
          : BigInt(status.fullyScannedHeight),
      reasonCode: status.reasonCode,
      checkedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        zcashObserverStatuses.organizationId,
        zcashObserverStatuses.network,
      ],
      set: {
        availability: status.availability,
        chainTipHeight:
          status.chainTipHeight === undefined
            ? null
            : BigInt(status.chainTipHeight),
        fullyScannedHeight:
          status.fullyScannedHeight === undefined
            ? null
            : BigInt(status.fullyScannedHeight),
        reasonCode: status.reasonCode,
        checkedAt: new Date(),
      },
    })
    .returning();
  return stored;
}

export function listObligationObservations(
  db: Database,
  organizationId: string,
  obligationId: string,
) {
  return db
    .select()
    .from(settlementObservations)
    .where(
      and(
        eq(settlementObservations.organizationId, organizationId),
        eq(settlementObservations.obligationId, obligationId),
      ),
    )
    .orderBy(desc(settlementObservations.observedAt));
}

export async function getObserverStatus(
  db: Database,
  organizationId: string,
  network: string,
) {
  const rows = await db
    .select()
    .from(zcashObserverStatuses)
    .where(
      and(
        eq(zcashObserverStatuses.organizationId, organizationId),
        eq(zcashObserverStatuses.network, network),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}
