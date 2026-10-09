import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./identity";
import {
  obligations,
  policyDecisions,
  vendors,
  vendorDestinations,
} from "./operations";
import { createdAt, id, settlementState } from "./shared";

export const settlementQuotes = pgTable(
  "settlement_quotes",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    obligationVersion: integer("obligation_version").notNull(),
    businessCurrency: text("business_currency").notNull(),
    businessAmountMinor: bigint("business_amount_minor", {
      mode: "bigint",
    }).notNull(),
    zatoshiAmount: bigint("zatoshi_amount", { mode: "bigint" }).notNull(),
    source: text("source").notNull(),
    sourceKind: text("source_kind").notNull(),
    version: integer("version").notNull().default(1),
    idempotencyKey: text("idempotency_key").notNull(),
    quotedAt: timestamp("quoted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
  },
  (t) => [
    index("settlement_quotes_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
    ),
    uniqueIndex("settlement_quotes_org_idempotency_unique").on(
      t.organizationId,
      t.idempotencyKey,
    ),
  ],
);

export const settlementIntents = pgTable(
  "settlement_intents",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => settlementQuotes.id),
    policyDecisionId: uuid("policy_decision_id")
      .notNull()
      .references(() => policyDecisions.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => vendorDestinations.id),
    destinationReceiver: text("destination_receiver").notNull(),
    obligationVersion: integer("obligation_version").notNull(),
    businessCurrency: text("business_currency").notNull(),
    businessAmountMinor: bigint("business_amount_minor", {
      mode: "bigint",
    }).notNull(),
    zatoshiAmount: bigint("zatoshi_amount", { mode: "bigint" }).notNull(),
    quoteSource: text("quote_source").notNull(),
    quotedAt: timestamp("quoted_at", { withTimezone: true }).notNull(),
    quoteExpiresAt: timestamp("quote_expires_at", {
      withTimezone: true,
    }).notNull(),
    network: text("network").notNull(),
    privacyMode: text("privacy_mode").notNull(),
    memoReferenceHash: text("memo_reference_hash").notNull(),
    paymentRequestUri: text("payment_request_uri").notNull(),
    intentVersion: integer("intent_version").notNull().default(1),
    intentHash: text("intent_hash").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    state: settlementState("state").notNull().default("PREPARED"),
    preparedBy: uuid("prepared_by")
      .notNull()
      .references(() => users.id),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
    invalidationReason: text("invalidation_reason"),
    createdAt: createdAt(),
  },
  (t) => [
    index("settlement_intents_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
    ),
    uniqueIndex("settlement_intents_org_quote_unique").on(
      t.organizationId,
      t.quoteId,
    ),
    uniqueIndex("settlement_intents_org_hash_unique").on(
      t.organizationId,
      t.intentHash,
    ),
    uniqueIndex("settlement_intents_org_idempotency_unique").on(
      t.organizationId,
      t.idempotencyKey,
    ),
  ],
);

export const settlements = pgTable(
  "settlements",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    intentId: uuid("intent_id")
      .notNull()
      .references(() => settlementIntents.id),
    state: settlementState("state").notNull().default("NOT_CREATED"),
    intentHash: text("intent_hash").notNull(),
    signerRequestId: text("signer_request_id"),
    signerType: text("signer_type"),
    signerVersion: text("signer_version"),
    networkFeeZat: bigint("network_fee_zat", { mode: "bigint" }),
    signedTxHash: text("signed_tx_hash"),
    txRefPrivate: text("tx_ref_private"),
    broadcastRequestId: text("broadcast_request_id"),
    errorCode: text("error_code"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    broadcastAt: timestamp("broadcast_at", { withTimezone: true }),
    detectedAt: timestamp("detected_at", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("settlements_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
    ),
    uniqueIndex("settlements_org_intent_unique").on(
      t.organizationId,
      t.intentId,
    ),
    uniqueIndex("settlements_org_signer_request_unique").on(
      t.organizationId,
      t.signerRequestId,
    ),
    uniqueIndex("settlements_org_broadcast_request_unique").on(
      t.organizationId,
      t.broadcastRequestId,
    ),
    uniqueIndex("settlements_org_txref_unique").on(
      t.organizationId,
      t.txRefPrivate,
    ),
  ],
);

export const settlementObservationTargets = pgTable(
  "settlement_observation_targets",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    settlementId: uuid("settlement_id").references(() => settlements.id),
    intentId: uuid("intent_id").references(() => settlementIntents.id),
    network: text("network").notNull(),
    receiverFingerprint: text("receiver_fingerprint").notNull(),
    memoReferenceHash: text("memo_reference_hash").notNull(),
    expectedAmountZat: bigint("expected_amount_zat", {
      mode: "bigint",
    }).notNull(),
    requiredConfirmations: integer("required_confirmations").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("observation_targets_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
    ),
    index("observation_targets_org_receiver_idx").on(
      t.organizationId,
      t.network,
      t.receiverFingerprint,
    ),
    uniqueIndex("observation_targets_org_settlement_unique").on(
      t.organizationId,
      t.settlementId,
    ),
  ],
);

export const zcashObserverStatuses = pgTable(
  "zcash_observer_statuses",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    network: text("network").notNull(),
    availability: text("availability").notNull(),
    chainTipHeight: bigint("chain_tip_height", { mode: "bigint" }),
    fullyScannedHeight: bigint("fully_scanned_height", { mode: "bigint" }),
    reasonCode: text("reason_code"),
    checkedAt: timestamp("checked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("zcash_observer_statuses_org_network_unique").on(
      t.organizationId,
      t.network,
    ),
  ],
);

export const settlementObservations = pgTable(
  "settlement_observations",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    settlementId: uuid("settlement_id").references(() => settlements.id),
    targetId: uuid("target_id").references(
      () => settlementObservationTargets.id,
    ),
    network: text("network").notNull(),
    txid: text("txid").notNull(),
    outputIndex: integer("output_index").notNull(),
    pool: text("pool").notNull(),
    observerSource: text("observer_source").notNull(),
    blockHeight: bigint("block_height", { mode: "bigint" }),
    confirmations: integer("confirmations").notNull(),
    observedAmountZat: bigint("observed_amount_zat", {
      mode: "bigint",
    }).notNull(),
    memoReferenceHash: text("memo_reference_hash"),
    receiverFingerprint: text("receiver_fingerprint").notNull(),
    correlationStatus: text("correlation_status").notNull(),
    state: text("state").notNull(),
    reasonsJson: jsonb("reasons_json").notNull().default([]),
    firstObservedAt: timestamp("first_observed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    observedAt: timestamp("observed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    evidenceJson: jsonb("evidence_json").notNull().default({}),
  },
  (t) => [
    index("settlement_observations_org_settlement_idx").on(
      t.organizationId,
      t.settlementId,
    ),
    index("settlement_observations_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
    ),
    uniqueIndex("settlement_observations_chain_output_unique").on(
      t.organizationId,
      t.network,
      t.txid,
      t.pool,
      t.outputIndex,
    ),
  ],
);

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    settlementId: uuid("settlement_id").references(() => settlements.id),
    category: text("category").notNull(),
    fiatCurrency: text("fiat_currency").notNull(),
    fiatAmountMinor: bigint("fiat_amount_minor", { mode: "bigint" }).notNull(),
    bookedAt: timestamp("booked_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("ledger_entries_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
    ),
  ],
);
