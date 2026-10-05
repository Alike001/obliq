import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations } from "./identity";
import { obligations, vendorDestinations } from "./operations";
import { createdAt, id, settlementState } from "./shared";

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
    state: settlementState("state").notNull().default("PREPARED"),
    privacyMode: text("privacy_mode").notNull(),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => vendorDestinations.id),
    obligationVersion: integer("obligation_version").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("settlement_intents_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
    ),
  ],
);

export const settlementQuotes = pgTable(
  "settlement_quotes",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    settlementIntentId: uuid("settlement_intent_id")
      .notNull()
      .references(() => settlementIntents.id),
    fiatCurrency: text("fiat_currency").notNull(),
    fiatAmountMinor: bigint("fiat_amount_minor", { mode: "bigint" }).notNull(),
    zatoshiAmount: bigint("zatoshi_amount", { mode: "bigint" }).notNull(),
    source: text("source").notNull(),
    quotedAt: timestamp("quoted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("settlement_quotes_org_intent_idx").on(
      t.organizationId,
      t.settlementIntentId,
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
    txRefPrivate: text("tx_ref_private"),
    broadcastAt: timestamp("broadcast_at", { withTimezone: true }),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("settlements_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
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
    settlementId: uuid("settlement_id")
      .notNull()
      .references(() => settlements.id),
    kind: text("kind").notNull(),
    blockHeight: bigint("block_height", { mode: "bigint" }),
    confirmations: integer("confirmations"),
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
