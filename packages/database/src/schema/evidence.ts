import {
  bigserial,
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { organizations, users } from "./identity";
import { obligations } from "./operations";
import { settlements } from "./settlement";
import { createdAt, id } from "./shared";

export const evidencePackages = pgTable(
  "evidence_packages",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    settlementId: uuid("settlement_id").references(() => settlements.id),
    status: text("status").notNull(),
    artifactHash: text("artifact_hash"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: createdAt(),
  },
  (t) => [
    index("evidence_packages_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
    ),
  ],
);

export const evidenceDisclosures = pgTable("evidence_disclosures", {
  id: id(),
  evidencePackageId: uuid("evidence_package_id")
    .notNull()
    .references(() => evidencePackages.id),
  fieldKey: text("field_key").notNull(),
  disclosedValueHash: text("disclosed_value_hash").notNull(),
  createdAt: createdAt(),
});

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
