import {
  bigint,
  boolean,
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
  approvalState,
  createdAt,
  id,
  obligationState,
  recordStatus,
  verificationStatus,
} from "./shared";

export const vendors = pgTable(
  "vendors",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    legalName: text("legal_name").notNull(),
    displayName: text("display_name").notNull(),
    status: recordStatus("status").notNull().default("ACTIVE"),
    category: text("category"),
    createdAt: createdAt(),
  },
  (t) => [index("vendors_org_idx").on(t.organizationId)],
);

export const vendorDestinations = pgTable(
  "vendor_destinations",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    network: text("network").notNull(),
    receiver: text("receiver").notNull(),
    fingerprint: text("fingerprint").notNull(),
    verificationStatus: verificationStatus("verification_status")
      .notNull()
      .default("UNVERIFIED"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    supersededAt: timestamp("superseded_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("destinations_org_vendor_idx").on(t.organizationId, t.vendorId),
  ],
);

export const obligationSources = pgTable(
  "obligation_sources",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    kind: text("kind").notNull(),
    storageRef: text("storage_ref"),
    contentHash: text("content_hash"),
    metadataJson: jsonb("metadata_json").notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [index("obligation_sources_org_idx").on(t.organizationId)],
);

export const obligations = pgTable(
  "obligations",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    vendorId: uuid("vendor_id").references(() => vendors.id),
    type: text("type").notNull(),
    reference: text("reference").notNull(),
    currency: text("currency").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    state: obligationState("state").notNull().default("DRAFT"),
    sourceId: uuid("source_id").references(() => obligationSources.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("obligations_org_state_idx").on(t.organizationId, t.state),
    uniqueIndex("obligations_org_reference_unique").on(
      t.organizationId,
      t.reference,
    ),
  ],
);

export const policies = pgTable(
  "policies",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    ruleJson: jsonb("rule_json").notNull().default({}),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
  },
  (t) => [index("policies_org_idx").on(t.organizationId)],
);

export const policyDecisions = pgTable(
  "policy_decisions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id),
    result: text("result").notNull(),
    reasonsJson: jsonb("reasons_json").notNull().default([]),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("policy_decisions_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
    ),
  ],
);

export const approvalRequirements = pgTable(
  "approval_requirements",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    roleOrActor: text("role_or_actor").notNull(),
    thresholdGroup: text("threshold_group"),
    state: approvalState("state").notNull().default("PENDING"),
    createdAt: createdAt(),
  },
  (t) => [
    index("approval_requirements_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
    ),
  ],
);

export const approvals = pgTable(
  "approvals",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    decision: text("decision").notNull(),
    note: text("note"),
    obligationVersion: integer("obligation_version").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("approvals_org_obligation_idx").on(t.organizationId, t.obligationId),
  ],
);
