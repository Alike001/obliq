import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations, users } from "./identity";
import { obligations, vendorDestinations, vendors } from "./operations";
import {
  createdAt,
  id,
  recipientChallengeState,
  recipientInvitationState,
  recipientSessionState,
} from "./shared";

export const recipientInvitations = pgTable(
  "recipient_invitations",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    obligationId: uuid("obligation_id")
      .notNull()
      .references(() => obligations.id),
    obligationVersion: integer("obligation_version").notNull(),
    baseDestinationId: uuid("base_destination_id").references(
      () => vendorDestinations.id,
    ),
    baseDestinationVersion: integer("base_destination_version"),
    purpose: text("purpose").notNull(),
    network: text("network").notNull(),
    contactChannel: text("contact_channel").notNull(),
    contactFingerprint: text("contact_fingerprint").notNull(),
    tokenHash: text("token_hash").notNull(),
    state: recipientInvitationState("state").notNull().default("ACTIVE"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    consumedDestinationId: uuid("consumed_destination_id").references(
      () => vendorDestinations.id,
    ),
    consumedRequestHash: text("consumed_request_hash"),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by").references(() => users.id),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    reasonCode: text("reason_code"),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("recipient_invitations_token_hash_unique").on(t.tokenHash),
    index("recipient_invitations_org_vendor_idx").on(
      t.organizationId,
      t.vendorId,
    ),
    index("recipient_invitations_org_obligation_idx").on(
      t.organizationId,
      t.obligationId,
    ),
    uniqueIndex("recipient_invitations_active_vendor_unique")
      .on(t.organizationId, t.vendorId, t.purpose)
      .where(sql`${t.state} in ('ACTIVE', 'CONTACT_VERIFIED')`),
  ],
);

export const recipientVerificationChallenges = pgTable(
  "recipient_verification_challenges",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => recipientInvitations.id),
    codeHash: text("code_hash").notNull(),
    state: recipientChallengeState("state").notNull().default("ACTIVE"),
    attemptCount: integer("attempt_count").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    providerReference: text("provider_reference"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("recipient_challenges_invitation_idx").on(
      t.organizationId,
      t.invitationId,
    ),
    uniqueIndex("recipient_challenges_active_unique")
      .on(t.invitationId)
      .where(sql`${t.state} = 'ACTIVE'`),
  ],
);

export const recipientSessions = pgTable(
  "recipient_sessions",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => recipientInvitations.id),
    tokenHash: text("token_hash").notNull(),
    state: recipientSessionState("state").notNull().default("ACTIVE"),
    contactVerifiedAt: timestamp("contact_verified_at", {
      withTimezone: true,
    }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("recipient_sessions_token_hash_unique").on(t.tokenHash),
    index("recipient_sessions_invitation_idx").on(
      t.organizationId,
      t.invitationId,
    ),
  ],
);

export const destinationAttestations = pgTable(
  "destination_attestations",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    destinationId: uuid("destination_id")
      .notNull()
      .references(() => vendorDestinations.id),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => recipientInvitations.id),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => recipientSessions.id),
    attestationType: text("attestation_type").notNull(),
    contactFingerprint: text("contact_fingerprint").notNull(),
    verificationMethod: text("verification_method").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("destination_attestations_destination_unique").on(
      t.destinationId,
    ),
    index("destination_attestations_org_invitation_idx").on(
      t.organizationId,
      t.invitationId,
    ),
  ],
);

export const recipientOperationReceipts = pgTable(
  "recipient_operation_receipts",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => recipientInvitations.id),
    operationType: text("operation_type").notNull(),
    idempotencyKeyHash: text("idempotency_key_hash").notNull(),
    requestHash: text("request_hash").notNull(),
    status: text("status").notNull(),
    resultDestinationId: uuid("result_destination_id").references(
      () => vendorDestinations.id,
    ),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("recipient_receipts_idempotency_unique").on(
      t.invitationId,
      t.operationType,
      t.idempotencyKeyHash,
    ),
    index("recipient_receipts_org_invitation_idx").on(
      t.organizationId,
      t.invitationId,
    ),
  ],
);
