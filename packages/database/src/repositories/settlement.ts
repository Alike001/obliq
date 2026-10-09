import {
  createExternalSignerHandoff,
  createZip321PaymentRequest,
  memoReferenceForIntent,
  memoReferenceHash,
  receiverFingerprint,
  settlementIntentHash,
  type SettlementIntentBinding,
} from "@obliq/zcash";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { createDatabase } from "../index";
import {
  approvalRequirements,
  obligations,
  policyDecisions,
  settlementIntents,
  settlementObservationTargets,
  settlementQuotes,
  settlementReadiness,
  settlements,
  vendorDestinations,
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
const preparationRoles: readonly MembershipRole[] = [
  "OWNER",
  "CFO",
  "TREASURY",
];
const executionRoles: readonly MembershipRole[] = [
  "OWNER",
  "CFO",
  "TREASURY",
  "SIGNER",
];
const txidPattern = /^[0-9a-f]{64}$/u;
const controlCharacterPattern = /[\u0000-\u001f\u007f]/u;

function requireRole(role: MembershipRole, allowed: readonly MembershipRole[]) {
  if (!allowed.includes(role))
    throw new Error("Actor cannot operate settlement execution");
}

async function lock(tx: Transaction, organizationId: string) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${organizationId}))`,
  );
}

async function currentAuthorization(
  tx: Transaction,
  actor: TenantActor,
  obligationId: string,
  allowedStates: readonly string[] = ["READY_TO_SETTLE"],
) {
  const rows = await tx
    .select({
      obligation: obligations,
      readiness: settlementReadiness,
      decision: policyDecisions,
      destination: vendorDestinations,
      vendor: vendors,
    })
    .from(obligations)
    .innerJoin(
      settlementReadiness,
      and(
        eq(settlementReadiness.organizationId, actor.organizationId),
        eq(settlementReadiness.obligationId, obligations.id),
      ),
    )
    .innerJoin(
      policyDecisions,
      and(
        eq(policyDecisions.organizationId, actor.organizationId),
        eq(policyDecisions.id, settlementReadiness.policyDecisionId),
      ),
    )
    .innerJoin(
      vendorDestinations,
      and(
        eq(vendorDestinations.organizationId, actor.organizationId),
        eq(vendorDestinations.id, settlementReadiness.destinationId),
      ),
    )
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
        eq(obligations.id, obligationId),
      ),
    )
    .orderBy(desc(settlementReadiness.evaluatedAt))
    .limit(1);
  const current = rows[0];
  if (!current) throw new Error("Current settlement readiness is unavailable");
  if (!allowedStates.includes(current.obligation.state))
    throw new Error("Obligation is not in an executable settlement state");
  if (
    current.readiness.result !== "READY" ||
    current.readiness.obligationVersion !== current.obligation.version ||
    current.decision.obligationVersion !== current.obligation.version ||
    current.decision.id !== current.readiness.policyDecisionId ||
    current.destination.id !== current.obligation.destinationId ||
    current.destination.verificationStatus !== "VERIFIED_MANUALLY" ||
    current.destination.supersededAt
  )
    throw new Error("Settlement authorization is stale or invalid");
  const pending = await tx
    .select({ id: approvalRequirements.id })
    .from(approvalRequirements)
    .where(
      and(
        eq(approvalRequirements.organizationId, actor.organizationId),
        eq(approvalRequirements.policyDecisionId, current.decision.id),
        ne(approvalRequirements.state, "APPROVED"),
      ),
    )
    .limit(1);
  if (pending[0]) throw new Error("Approval requirements are not satisfied");
  return current;
}

type QualificationNetwork = "regtest" | "testnet";

function quoteSourceForNetwork(network: QualificationNetwork) {
  if (network === "testnet")
    return { source: "TESTNET_FIXED", sourceKind: "CONTROLLED_TESTNET" };
  if (network === "regtest")
    return { source: "REGTEST_FIXED", sourceKind: "CONTROLLED_REGTEST" };
  throw new Error("Network is not eligible for shielded qualification");
}

function networkForQuoteSource(sourceKind: string): QualificationNetwork {
  if (sourceKind === "CONTROLLED_REGTEST") return "regtest";
  if (sourceKind === "CONTROLLED_TESTNET") return "testnet";
  throw new Error("Quote source is not eligible for shielded qualification");
}

function requireQualificationNetwork(network: string): QualificationNetwork {
  if (network === "regtest" || network === "testnet") return network;
  throw new Error("Settlement intent network is not eligible for execution");
}

export async function createControlledQualificationQuote(
  db: Database,
  actor: TenantActor,
  input: {
    obligationId: string;
    zatoshiAmount: bigint;
    idempotencyKey: string;
    network: QualificationNetwork;
    expiresAt?: Date;
  },
) {
  if (input.zatoshiAmount <= 0n)
    throw new Error("Zatoshi amount must be positive");
  if (!input.idempotencyKey.trim())
    throw new Error("Idempotency key is required");
  return db.transaction(async (tx) => {
    await lock(tx, actor.organizationId);
    requireRole(
      (await requireActiveMembership(tx, actor)).role,
      preparationRoles,
    );
    const prior = await tx
      .select()
      .from(settlementQuotes)
      .where(
        and(
          eq(settlementQuotes.organizationId, actor.organizationId),
          eq(settlementQuotes.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (prior[0]) return prior[0];
    const current = await currentAuthorization(tx, actor, input.obligationId);
    const quotedAt = new Date();
    const expiresAt =
      input.expiresAt ?? new Date(quotedAt.getTime() + 15 * 60_000);
    if (expiresAt <= quotedAt)
      throw new Error("Quote expiry must be in the future");
    const quoteSource = quoteSourceForNetwork(input.network);
    const [quote] = await tx
      .insert(settlementQuotes)
      .values({
        organizationId: actor.organizationId,
        obligationId: current.obligation.id,
        obligationVersion: current.obligation.version,
        businessCurrency: current.obligation.currency,
        businessAmountMinor: current.obligation.amountMinor,
        zatoshiAmount: input.zatoshiAmount,
        source: quoteSource.source,
        sourceKind: quoteSource.sourceKind,
        idempotencyKey: input.idempotencyKey,
        quotedAt,
        expiresAt,
        createdBy: actor.userId,
      })
      .returning();
    if (!quote) throw new Error("Quote insert failed");
    await appendAuditEvent(tx, actor, {
      eventType: "SETTLEMENT_QUOTE_CREATED",
      subjectType: "SETTLEMENT_QUOTE",
      subjectId: quote.id,
      payload: {
        obligationId: quote.obligationId,
        source: quote.source,
        expiresAt: quote.expiresAt.toISOString(),
      },
    });
    return quote;
  });
}

export function createControlledRegtestQuote(
  db: Database,
  actor: TenantActor,
  input: {
    obligationId: string;
    zatoshiAmount: bigint;
    idempotencyKey: string;
    expiresAt?: Date;
  },
) {
  return createControlledQualificationQuote(db, actor, {
    ...input,
    network: "regtest",
  });
}

export async function prepareSettlementIntent(
  db: Database,
  actor: TenantActor,
  input: {
    quoteId: string;
    idempotencyKey: string;
    requiredConfirmations?: number;
  },
) {
  const requiredConfirmations = input.requiredConfirmations ?? 3;
  if (!Number.isInteger(requiredConfirmations) || requiredConfirmations < 1)
    throw new Error("Required confirmations must be a positive integer");
  return db.transaction(async (tx) => {
    await lock(tx, actor.organizationId);
    requireRole(
      (await requireActiveMembership(tx, actor)).role,
      preparationRoles,
    );
    const prior = await tx
      .select()
      .from(settlementIntents)
      .where(
        and(
          eq(settlementIntents.organizationId, actor.organizationId),
          eq(settlementIntents.idempotencyKey, input.idempotencyKey),
        ),
      )
      .limit(1);
    if (prior[0]) return prior[0];
    const quotes = await tx
      .select()
      .from(settlementQuotes)
      .where(
        and(
          eq(settlementQuotes.organizationId, actor.organizationId),
          eq(settlementQuotes.id, input.quoteId),
        ),
      )
      .limit(1);
    const quote = quotes[0];
    if (!quote) return null;
    if (quote.expiresAt <= new Date())
      throw new Error("Quote has expired; re-quote is required");
    const current = await currentAuthorization(tx, actor, quote.obligationId);
    if (
      quote.obligationVersion !== current.obligation.version ||
      quote.businessCurrency !== current.obligation.currency ||
      quote.businessAmountMinor !== current.obligation.amountMinor
    )
      throw new Error("Quote no longer matches the obligation");
    const network = networkForQuoteSource(quote.sourceKind);
    const intentId = randomUUID();
    const memoReference = memoReferenceForIntent(intentId);
    const binding: SettlementIntentBinding = {
      organizationId: actor.organizationId,
      obligationId: current.obligation.id,
      obligationVersion: current.obligation.version,
      policyDecisionId: current.decision.id,
      vendorId: current.vendor.id,
      destinationId: current.destination.id,
      destinationReceiver: current.destination.receiver,
      businessCurrency: quote.businessCurrency,
      businessAmountMinor: quote.businessAmountMinor.toString(),
      quoteId: quote.id,
      quoteVersion: quote.version,
      quoteSource: quote.source,
      quotedAt: quote.quotedAt.toISOString(),
      quoteExpiresAt: quote.expiresAt.toISOString(),
      amountZat: quote.zatoshiAmount.toString(),
      memoReference,
      network,
      privacyMode: "SHIELDED",
      intentVersion: 1,
    };
    const intentHash = settlementIntentHash(binding);
    const paymentRequestUri = createZip321PaymentRequest({
      network,
      receiver: current.destination.receiver,
      amountZat: quote.zatoshiAmount,
      memoReference,
    });
    const [intent] = await tx
      .insert(settlementIntents)
      .values({
        id: intentId,
        organizationId: actor.organizationId,
        obligationId: current.obligation.id,
        quoteId: quote.id,
        policyDecisionId: current.decision.id,
        vendorId: current.vendor.id,
        destinationId: current.destination.id,
        destinationReceiver: current.destination.receiver,
        obligationVersion: current.obligation.version,
        businessCurrency: quote.businessCurrency,
        businessAmountMinor: quote.businessAmountMinor,
        zatoshiAmount: quote.zatoshiAmount,
        quoteSource: quote.source,
        quotedAt: quote.quotedAt,
        quoteExpiresAt: quote.expiresAt,
        network,
        privacyMode: "SHIELDED",
        memoReferenceHash: memoReferenceHash(memoReference),
        paymentRequestUri,
        intentHash,
        idempotencyKey: input.idempotencyKey,
        state: "AWAITING_SIGNATURE",
        preparedBy: actor.userId,
      })
      .returning();
    if (!intent) throw new Error("Settlement intent insert failed");
    const [settlement] = await tx
      .insert(settlements)
      .values({
        organizationId: actor.organizationId,
        obligationId: intent.obligationId,
        intentId: intent.id,
        state: "AWAITING_SIGNATURE",
        intentHash,
      })
      .returning();
    if (!settlement) throw new Error("Settlement insert failed");
    await tx.insert(settlementObservationTargets).values({
      organizationId: actor.organizationId,
      obligationId: intent.obligationId,
      settlementId: settlement.id,
      intentId: intent.id,
      network: intent.network,
      receiverFingerprint: receiverFingerprint(intent.destinationReceiver),
      memoReferenceHash: intent.memoReferenceHash,
      expectedAmountZat: intent.zatoshiAmount,
      requiredConfirmations,
    });
    await tx
      .update(obligations)
      .set({ state: "SETTLEMENT_PREPARED", updatedAt: new Date() })
      .where(
        and(
          eq(obligations.organizationId, actor.organizationId),
          eq(obligations.id, intent.obligationId),
        ),
      );
    await appendAuditEvent(tx, actor, {
      eventType: "SETTLEMENT_INTENT_CREATED",
      subjectType: "SETTLEMENT_INTENT",
      subjectId: intent.id,
      payload: {
        obligationId: intent.obligationId,
        intentHash,
        network: intent.network,
        privacyMode: intent.privacyMode,
      },
    });
    return intent;
  });
}

async function getExecution(
  tx: Transaction,
  actor: TenantActor,
  settlementId: string,
) {
  const rows = await tx
    .select({
      settlement: settlements,
      intent: settlementIntents,
      quote: settlementQuotes,
    })
    .from(settlements)
    .innerJoin(
      settlementIntents,
      and(
        eq(settlementIntents.organizationId, actor.organizationId),
        eq(settlementIntents.id, settlements.intentId),
      ),
    )
    .innerJoin(
      settlementQuotes,
      and(
        eq(settlementQuotes.organizationId, actor.organizationId),
        eq(settlementQuotes.id, settlementIntents.quoteId),
      ),
    )
    .where(
      and(
        eq(settlements.organizationId, actor.organizationId),
        eq(settlements.id, settlementId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

async function revalidateExecution(
  tx: Transaction,
  actor: TenantActor,
  execution: NonNullable<Awaited<ReturnType<typeof getExecution>>>,
  allowedObligationStates: readonly string[] = [
    "SETTLEMENT_PREPARED",
    "SIGNING",
  ],
) {
  if (
    execution.intent.invalidatedAt ||
    execution.intent.state === "INVALIDATED"
  )
    throw new Error("Settlement intent is invalidated");
  if (execution.quote.expiresAt <= new Date())
    throw new Error("Quote has expired; re-quote is required");
  const current = await currentAuthorization(
    tx,
    actor,
    execution.intent.obligationId,
    allowedObligationStates,
  );
  if (
    current.obligation.version !== execution.intent.obligationVersion ||
    current.decision.id !== execution.intent.policyDecisionId ||
    current.destination.id !== execution.intent.destinationId ||
    current.destination.receiver !== execution.intent.destinationReceiver ||
    current.obligation.amountMinor !== execution.intent.businessAmountMinor ||
    current.obligation.currency !== execution.intent.businessCurrency
  )
    throw new Error(
      "Settlement intent no longer matches current authorization",
    );
  if (
    requireQualificationNetwork(execution.intent.network) !==
    networkForQuoteSource(execution.quote.sourceKind)
  )
    throw new Error("Settlement intent network does not match its quote");
}

export async function requestExternalSignature(
  db: Database,
  actor: TenantActor,
  settlementId: string,
  signerRequestId: string,
) {
  return db.transaction(async (tx) => {
    await lock(tx, actor.organizationId);
    requireRole(
      (await requireActiveMembership(tx, actor)).role,
      executionRoles,
    );
    const execution = await getExecution(tx, actor, settlementId);
    if (!execution) return null;
    if (
      execution.settlement.signerRequestId &&
      execution.settlement.signerRequestId !== signerRequestId
    )
      throw new Error("A different signing request already exists");
    await revalidateExecution(tx, actor, execution);
    await tx
      .update(settlements)
      .set({ signerRequestId })
      .where(
        and(
          eq(settlements.id, settlementId),
          eq(settlements.organizationId, actor.organizationId),
        ),
      );
    await tx
      .update(obligations)
      .set({ state: "SIGNING", updatedAt: new Date() })
      .where(
        and(
          eq(obligations.id, execution.intent.obligationId),
          eq(obligations.organizationId, actor.organizationId),
        ),
      );
    if (!execution.settlement.signerRequestId)
      await appendAuditEvent(tx, actor, {
        eventType: "SIGNING_REQUESTED",
        subjectType: "SETTLEMENT",
        subjectId: settlementId,
        payload: {
          intentId: execution.intent.id,
          intentHash: execution.intent.intentHash,
        },
      });
    return createExternalSignerHandoff({
      intentId: execution.intent.id,
      intentHash: execution.intent.intentHash,
      network: requireQualificationNetwork(execution.intent.network),
      receiver: execution.intent.destinationReceiver,
      amountZat: execution.intent.zatoshiAmount,
      quoteExpiresAt: execution.intent.quoteExpiresAt,
    });
  });
}

export async function recordExternalSigning(
  db: Database,
  actor: TenantActor,
  input: {
    settlementId: string;
    signerRequestId: string;
    outcome: "AUTHORIZED" | "REJECTED" | "UNAVAILABLE" | "FAILED";
    signerType?: "ZALLET_PCZT";
    signerVersion?: string;
    networkFeeZat?: bigint;
    txid?: string;
    signedTxHash?: string;
    errorCode?: string;
  },
) {
  return db.transaction(async (tx) => {
    await lock(tx, actor.organizationId);
    requireRole(
      (await requireActiveMembership(tx, actor)).role,
      executionRoles,
    );
    const execution = await getExecution(tx, actor, input.settlementId);
    if (!execution) return null;
    if (execution.settlement.signerRequestId !== input.signerRequestId)
      throw new Error("Signing request does not match");
    if (
      input.outcome !== "AUTHORIZED" &&
      (execution.settlement.txRefPrivate || execution.settlement.signedAt)
    )
      throw new Error("Signing has already been finalized");
    if (input.outcome === "AUTHORIZED") {
      await revalidateExecution(tx, actor, execution);
      if (
        !input.txid ||
        !txidPattern.test(input.txid) ||
        !input.signedTxHash ||
        !txidPattern.test(input.signedTxHash) ||
        !input.signerVersion ||
        input.signerVersion !== input.signerVersion.trim() ||
        input.signerVersion.length > 64 ||
        controlCharacterPattern.test(input.signerVersion) ||
        input.networkFeeZat === undefined ||
        input.networkFeeZat <= 0n ||
        input.networkFeeZat > execution.intent.zatoshiAmount ||
        input.networkFeeZat > 2_100_000_000_000_000n
      )
        throw new Error("A sanitized external signing receipt is required");
      if (execution.settlement.txRefPrivate) {
        if (
          execution.settlement.txRefPrivate !== input.txid ||
          execution.settlement.signedTxHash !== input.signedTxHash ||
          execution.settlement.networkFeeZat !== input.networkFeeZat
        )
          throw new Error("Conflicting signing receipt");
        return execution.settlement;
      }
      await tx
        .update(settlementIntents)
        .set({ state: "SIGNED" })
        .where(
          and(
            eq(settlementIntents.id, execution.intent.id),
            eq(settlementIntents.organizationId, actor.organizationId),
          ),
        );
      const [stored] = await tx
        .update(settlements)
        .set({
          state: "SIGNED",
          signerType: "ZALLET_PCZT",
          signerVersion: input.signerVersion,
          networkFeeZat: input.networkFeeZat,
          signedTxHash: input.signedTxHash,
          txRefPrivate: input.txid,
          signedAt: new Date(),
          errorCode: null,
        })
        .where(
          and(
            eq(settlements.id, input.settlementId),
            eq(settlements.organizationId, actor.organizationId),
          ),
        )
        .returning();
      await appendAuditEvent(tx, actor, {
        eventType: "SIGNING_AUTHORIZED",
        subjectType: "SETTLEMENT",
        subjectId: input.settlementId,
        payload: {
          signerType: "ZALLET_PCZT",
          signerVersion: input.signerVersion,
          networkFeeZat: input.networkFeeZat.toString(),
        },
      });
      await appendAuditEvent(tx, actor, {
        eventType: "TRANSACTION_SIGNED",
        subjectType: "SETTLEMENT",
        subjectId: input.settlementId,
        payload: {
          txid: input.txid,
          networkFeeZat: input.networkFeeZat.toString(),
        },
      });
      return stored;
    }
    const state =
      input.outcome === "REJECTED"
        ? "SIGNING_REJECTED"
        : input.outcome === "UNAVAILABLE"
          ? "UNAVAILABLE"
          : "FAILED";
    await tx
      .update(settlementIntents)
      .set({ state })
      .where(
        and(
          eq(settlementIntents.id, execution.intent.id),
          eq(settlementIntents.organizationId, actor.organizationId),
        ),
      );
    const [stored] = await tx
      .update(settlements)
      .set({ state, errorCode: input.errorCode ?? input.outcome })
      .where(
        and(
          eq(settlements.id, input.settlementId),
          eq(settlements.organizationId, actor.organizationId),
        ),
      )
      .returning();
    await tx
      .update(obligations)
      .set({
        state:
          input.outcome === "REJECTED"
            ? "READY_TO_SETTLE"
            : "SETTLEMENT_FAILED",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(obligations.id, execution.intent.obligationId),
          eq(obligations.organizationId, actor.organizationId),
        ),
      );
    await appendAuditEvent(tx, actor, {
      eventType:
        input.outcome === "REJECTED" ? "SIGNING_REJECTED" : "SIGNING_FAILED",
      subjectType: "SETTLEMENT",
      subjectId: input.settlementId,
      payload: {
        outcome: input.outcome,
        errorCode: input.errorCode ?? input.outcome,
      },
    });
    return stored;
  });
}

export async function recordExternalBroadcast(
  db: Database,
  actor: TenantActor,
  input: {
    settlementId: string;
    broadcastRequestId: string;
    txid: string;
    outcome: "BROADCAST" | "UNKNOWN" | "FAILED";
    errorCode?: string;
  },
) {
  if (!txidPattern.test(input.txid))
    throw new Error("Invalid transaction reference");
  return db.transaction(async (tx) => {
    await lock(tx, actor.organizationId);
    requireRole(
      (await requireActiveMembership(tx, actor)).role,
      executionRoles,
    );
    const execution = await getExecution(tx, actor, input.settlementId);
    if (!execution) return null;
    if (execution.settlement.broadcastRequestId) {
      if (
        execution.settlement.broadcastRequestId !== input.broadcastRequestId ||
        execution.settlement.txRefPrivate !== input.txid
      )
        throw new Error("Conflicting broadcast retry");
      if (
        execution.settlement.state !== "BROADCAST_UNKNOWN" ||
        input.outcome === "UNKNOWN"
      )
        return execution.settlement;
    }
    if (
      !["SIGNED", "BROADCAST_UNKNOWN"].includes(execution.settlement.state) ||
      execution.settlement.txRefPrivate !== input.txid
    )
      throw new Error("Only the exact signed transaction may be broadcast");
    await revalidateExecution(tx, actor, execution, [
      "SETTLEMENT_PREPARED",
      "SIGNING",
      "BROADCAST",
    ]);
    const state =
      input.outcome === "BROADCAST"
        ? "BROADCAST"
        : input.outcome === "UNKNOWN"
          ? "BROADCAST_UNKNOWN"
          : "FAILED";
    await tx
      .update(settlementIntents)
      .set({ state })
      .where(
        and(
          eq(settlementIntents.id, execution.intent.id),
          eq(settlementIntents.organizationId, actor.organizationId),
        ),
      );
    const [stored] = await tx
      .update(settlements)
      .set({
        state,
        broadcastRequestId: input.broadcastRequestId,
        broadcastAt: new Date(),
        errorCode: input.errorCode ?? null,
      })
      .where(
        and(
          eq(settlements.id, input.settlementId),
          eq(settlements.organizationId, actor.organizationId),
        ),
      )
      .returning();
    await tx
      .update(obligations)
      .set({
        state:
          input.outcome === "BROADCAST" || input.outcome === "UNKNOWN"
            ? "BROADCAST"
            : input.outcome === "FAILED"
              ? "SETTLEMENT_FAILED"
              : "SIGNING",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(obligations.id, execution.intent.obligationId),
          eq(obligations.organizationId, actor.organizationId),
        ),
      );
    await appendAuditEvent(tx, actor, {
      eventType:
        input.outcome === "BROADCAST"
          ? "TRANSACTION_BROADCAST"
          : input.outcome === "UNKNOWN"
            ? "BROADCAST_UNCERTAIN"
            : "BROADCAST_FAILED",
      subjectType: "SETTLEMENT",
      subjectId: input.settlementId,
      payload: {
        txid: input.txid,
        outcome: input.outcome,
        errorCode: input.errorCode ?? null,
      },
    });
    return stored;
  });
}

export function listSettlements(db: Database, organizationId: string) {
  return db
    .select({
      settlement: settlements,
      intent: settlementIntents,
      obligation: obligations,
      vendor: vendors,
    })
    .from(settlements)
    .innerJoin(
      settlementIntents,
      and(
        eq(settlementIntents.organizationId, organizationId),
        eq(settlementIntents.id, settlements.intentId),
      ),
    )
    .innerJoin(
      obligations,
      and(
        eq(obligations.organizationId, organizationId),
        eq(obligations.id, settlements.obligationId),
      ),
    )
    .innerJoin(
      vendors,
      and(
        eq(vendors.organizationId, organizationId),
        eq(vendors.id, obligations.vendorId),
      ),
    )
    .where(eq(settlements.organizationId, organizationId))
    .orderBy(desc(settlements.createdAt))
    .limit(100);
}

export async function getSettlement(
  db: Database,
  organizationId: string,
  settlementId: string,
) {
  const rows = await db
    .select({
      settlement: settlements,
      intent: settlementIntents,
      quote: settlementQuotes,
      obligation: obligations,
      vendor: vendors,
    })
    .from(settlements)
    .innerJoin(
      settlementIntents,
      and(
        eq(settlementIntents.organizationId, organizationId),
        eq(settlementIntents.id, settlements.intentId),
      ),
    )
    .innerJoin(
      settlementQuotes,
      and(
        eq(settlementQuotes.organizationId, organizationId),
        eq(settlementQuotes.id, settlementIntents.quoteId),
      ),
    )
    .innerJoin(
      obligations,
      and(
        eq(obligations.organizationId, organizationId),
        eq(obligations.id, settlements.obligationId),
      ),
    )
    .innerJoin(
      vendors,
      and(
        eq(vendors.organizationId, organizationId),
        eq(vendors.id, obligations.vendorId),
      ),
    )
    .where(
      and(
        eq(settlements.organizationId, organizationId),
        eq(settlements.id, settlementId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getObligationSettlement(
  db: Database,
  organizationId: string,
  obligationId: string,
) {
  const rows = await db
    .select({ settlement: settlements, intent: settlementIntents })
    .from(settlements)
    .innerJoin(
      settlementIntents,
      and(
        eq(settlementIntents.organizationId, organizationId),
        eq(settlementIntents.id, settlements.intentId),
      ),
    )
    .where(
      and(
        eq(settlements.organizationId, organizationId),
        eq(settlements.obligationId, obligationId),
      ),
    )
    .orderBy(desc(settlements.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
