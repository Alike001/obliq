import type { EvidenceArtifact, EvidenceFieldKey } from "@obliq/evidence";
import {
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./identity";
import { obligations } from "./operations";
import { settlementObservations, settlements } from "./settlement";
import { createdAt, evidenceStatus, id } from "./shared";

export const evidencePackages = pgTable(
  "evidence_packages",
  {
    id: id(),
    publicId: text("public_id").notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    obligationVersion: integer("obligation_version").notNull(),
    settlementId: uuid("settlement_id")
      .notNull()
      .references(() => settlements.id),
    observationId: uuid("observation_id")
      .notNull()
      .references(() => settlementObservations.id),
    supersedesPackageId: uuid("supersedes_package_id").references(
      (): AnyPgColumn => evidencePackages.id,
    ),
    version: integer("version").notNull(),
    template: text("template").notNull(),
    status: evidenceStatus("status").notNull().default("ACTIVE"),
    schemaVersion: text("schema_version").notNull(),
    hashAlgorithm: text("hash_algorithm").notNull(),
    artifactJson: jsonb("artifact_json").$type<EvidenceArtifact>().notNull(),
    artifactHash: text("artifact_hash").notNull(),
    disclosedFieldsJson: jsonb("disclosed_fields_json")
      .$type<EvidenceFieldKey[]>()
      .notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    statusChangedAt: timestamp("status_changed_at", { withTimezone: true }),
    statusChangedBy: uuid("status_changed_by").references(() => users.id),
    statusReason: text("status_reason"),
  },
  (t) => [
    uniqueIndex("evidence_packages_public_id_unique").on(t.publicId),
    index("evidence_packages_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
    ),
    index("evidence_packages_org_settlement_idx").on(
      t.organizationId,
      t.settlementId,
    ),
  ],
);

export const evidencePreviews = pgTable(
  "evidence_previews",
  {
    id: id(),
    publicId: text("public_id").notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    obligationVersion: integer("obligation_version").notNull(),
    settlementId: uuid("settlement_id")
      .notNull()
      .references(() => settlements.id),
    observationId: uuid("observation_id")
      .notNull()
      .references(() => settlementObservations.id),
    supersedesPackageId: uuid("supersedes_package_id").references(
      () => evidencePackages.id,
    ),
    version: integer("version").notNull(),
    template: text("template").notNull(),
    artifactJson: jsonb("artifact_json").$type<EvidenceArtifact>().notNull(),
    artifactHash: text("artifact_hash").notNull(),
    disclosedFieldsJson: jsonb("disclosed_fields_json")
      .$type<EvidenceFieldKey[]>()
      .notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("evidence_previews_public_id_unique").on(t.publicId),
    index("evidence_previews_org_creator_idx").on(
      t.organizationId,
      t.createdBy,
    ),
  ],
);

export const evidenceDisclosures = pgTable(
  "evidence_disclosures",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    evidencePackageId: uuid("evidence_package_id")
      .notNull()
      .references(() => evidencePackages.id),
    fieldKey: text("field_key").notNull(),
    classification: text("classification").notNull(),
    provenance: text("provenance").notNull(),
    disclosedValueHash: text("disclosed_value_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("evidence_disclosures_package_field_unique").on(
      t.evidencePackageId,
      t.fieldKey,
    ),
    index("evidence_disclosures_org_package_idx").on(
      t.organizationId,
      t.evidencePackageId,
    ),
  ],
);

export const evidenceAccessEvents = pgTable(
  "evidence_access_events",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    evidencePackageId: uuid("evidence_package_id")
      .notNull()
      .references(() => evidencePackages.id),
    action: text("action").notNull(),
    subjectFingerprint: text("subject_fingerprint").notNull(),
    outcome: text("outcome").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("evidence_access_org_created_idx").on(t.organizationId, t.createdAt),
    index("evidence_access_package_created_idx").on(
      t.evidencePackageId,
      t.createdAt,
    ),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: id(),
    chainSequence: bigserial("chain_sequence", { mode: "bigint" }).notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    actorType: text("actor_type").notNull(),
    actorId: uuid("actor_id"),
    eventType: text("event_type").notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    previousHash: text("previous_hash"),
    payloadJson: jsonb("payload_json").notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_events_org_created_idx").on(t.organizationId, t.createdAt),
    uniqueIndex("audit_events_chain_sequence_unique").on(t.chainSequence),
    uniqueIndex("audit_events_org_payload_hash_unique").on(
      t.organizationId,
      t.payloadHash,
    ),
  ],
);
