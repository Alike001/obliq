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
  approvalDecision,
  approvalState,
  controlFindingOutcome,
  createdAt,
  duplicateKind,
  duplicateResolutionStatus,
  extractionMode,
  extractionStatus,
  id,
  obligationState,
  policyDecisionResult,
  readinessResult,
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
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
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
    verifiedBy: uuid("verified_by").references(() => users.id),
    verificationMethod: text("verification_method"),
    verificationNote: text("verification_note"),
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
    storageMode: text("storage_mode").notNull().default("LOCAL_DEVELOPMENT"),
    scanStatus: text("scan_status").notNull().default("NOT_REQUIRED"),
    quarantinedAt: timestamp("quarantined_at", { withTimezone: true }),
    scannedAt: timestamp("scanned_at", { withTimezone: true }),
    retentionUntil: timestamp("retention_until", { withTimezone: true }),
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
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    type: text("type").notNull(),
    reference: text("reference").notNull(),
    currency: text("currency").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    category: text("category"),
    description: text("description").notNull(),
    state: obligationState("state").notNull().default("DRAFT"),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => obligationSources.id),
    destinationId: uuid("destination_id").references(
      () => vendorDestinations.id,
    ),
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
    index("obligations_org_reference_idx").on(t.organizationId, t.reference),
  ],
);

export const obligationVersions = pgTable(
  "obligation_versions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    version: integer("version").notNull(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    type: text("type").notNull(),
    reference: text("reference").notNull(),
    currency: text("currency").notNull(),
    amountMinor: bigint("amount_minor", { mode: "bigint" }).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    category: text("category"),
    description: text("description").notNull(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => obligationSources.id),
    changedBy: uuid("changed_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("obligation_versions_obligation_version_unique").on(
      t.obligationId,
      t.version,
    ),
    index("obligation_versions_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
    ),
  ],
);

export const extractionRuns = pgTable(
  "extraction_runs",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => obligationSources.id),
    provider: text("provider").notNull(),
    mode: extractionMode("mode").notNull(),
    status: extractionStatus("status").notNull(),
    resultJson: jsonb("result_json").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("extraction_runs_org_source_idx").on(t.organizationId, t.sourceId),
  ],
);

export const duplicateFindings = pgTable(
  "duplicate_findings",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    candidateObligationId: uuid("candidate_obligation_id")
      .notNull()
      .references(() => obligations.id),
    kind: duplicateKind("kind").notNull(),
    reasonsJson: jsonb("reasons_json").notNull(),
    resolutionStatus: duplicateResolutionStatus("resolution_status")
      .notNull()
      .default("OPEN"),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolutionNote: text("resolution_note"),
    createdAt: createdAt(),
  },
  (t) => [
    index("duplicate_findings_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
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
    activeVersion: integer("active_version").notNull().default(1),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [index("policies_org_idx").on(t.organizationId)],
);

export const policyVersions = pgTable(
  "policy_versions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    policyId: uuid("policy_id")
      .notNull()
      .references(() => policies.id),
    version: integer("version").notNull(),
    configJson: jsonb("config_json").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("policy_versions_policy_version_unique").on(
      t.policyId,
      t.version,
    ),
    index("policy_versions_org_policy_idx").on(t.organizationId, t.policyId),
  ],
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
    policyVersionId: uuid("policy_version_id")
      .notNull()
      .references(() => policyVersions.id),
    obligationVersion: integer("obligation_version").notNull(),
    destinationId: uuid("destination_id").references(
      () => vendorDestinations.id,
    ),
    result: policyDecisionResult("result").notNull(),
    inputHash: text("input_hash").notNull(),
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

export const controlFindings = pgTable(
  "control_findings",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    policyDecisionId: uuid("policy_decision_id")
      .notNull()
      .references(() => policyDecisions.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    code: text("code").notNull(),
    outcome: controlFindingOutcome("outcome").notNull(),
    message: text("message").notNull(),
    metadataJson: jsonb("metadata_json").notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("control_findings_org_obligation_idx").on(
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
    policyDecisionId: uuid("policy_decision_id")
      .notNull()
      .references(() => policyDecisions.id),
    obligationVersion: integer("obligation_version").notNull(),
    role: text("role").notNull(),
    requiredCount: integer("required_count").notNull(),
    approvedCount: integer("approved_count").notNull().default(0),
    prohibitCreator: boolean("prohibit_creator").notNull().default(false),
    reason: text("reason").notNull(),
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
    requirementId: uuid("requirement_id")
      .notNull()
      .references(() => approvalRequirements.id),
    policyDecisionId: uuid("policy_decision_id")
      .notNull()
      .references(() => policyDecisions.id),
    decision: approvalDecision("decision").notNull(),
    capacityRole: text("capacity_role").notNull(),
    note: text("note"),
    obligationVersion: integer("obligation_version").notNull(),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
    invalidationReason: text("invalidation_reason"),
    createdAt: createdAt(),
  },
  (t) => [
    index("approvals_org_obligation_idx").on(t.organizationId, t.obligationId),
    uniqueIndex("approvals_decision_actor_unique").on(
      t.policyDecisionId,
      t.actorId,
    ),
  ],
);

export const settlementReadiness = pgTable(
  "settlement_readiness",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    obligationVersion: integer("obligation_version").notNull(),
    policyDecisionId: uuid("policy_decision_id")
      .notNull()
      .references(() => policyDecisions.id),
    destinationId: uuid("destination_id").references(
      () => vendorDestinations.id,
    ),
    result: readinessResult("result").notNull(),
    reasonsJson: jsonb("reasons_json").notNull(),
    evaluatedBy: uuid("evaluated_by")
      .notNull()
      .references(() => users.id),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("settlement_readiness_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
    ),
  ],
);
