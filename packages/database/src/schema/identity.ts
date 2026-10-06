import {
  integer,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, id, membershipRole, recordStatus } from "./shared";

export const organizations = pgTable("organizations", {
  id: id(),
  name: text("name").notNull(),
  createdAt: createdAt(),
});

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const memberships = pgTable(
  "memberships",
  {
    id: id(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: membershipRole("role").notNull(),
    status: recordStatus("status").notNull().default("ACTIVE"),
    createdAt: createdAt(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("memberships_org_user_unique").on(
      table.organizationId,
      table.userId,
    ),
    index("memberships_user_idx").on(table.userId),
  ],
);

export const authIdentities = pgTable(
  "auth_identities",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    issuer: text("issuer").notNull(),
    subject: text("subject").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("auth_identities_issuer_subject_unique").on(
      table.issuer,
      table.subject,
    ),
    index("auth_identities_user_idx").on(table.userId),
  ],
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: id(),
    tokenHash: text("token_hash").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("auth_sessions_token_hash_unique").on(table.tokenHash),
    index("auth_sessions_user_org_idx").on(table.userId, table.organizationId),
    index("auth_sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const authChallenges = pgTable(
  "auth_challenges",
  {
    id: id(),
    stateHash: text("state_hash").notNull(),
    codeVerifier: text("code_verifier").notNull(),
    nonce: text("nonce").notNull(),
    returnTo: text("return_to").notNull().default("/app"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("auth_challenges_state_hash_unique").on(table.stateHash),
    index("auth_challenges_expiry_idx").on(table.expiresAt),
  ],
);

export const rateLimitBuckets = pgTable(
  "rate_limit_buckets",
  {
    id: id(),
    scope: text("scope").notNull(),
    subjectHash: text("subject_hash").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(1),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("rate_limit_scope_subject_window_unique").on(
      table.scope,
      table.subjectHash,
      table.windowStart,
    ),
    index("rate_limit_window_idx").on(table.windowStart),
  ],
);
