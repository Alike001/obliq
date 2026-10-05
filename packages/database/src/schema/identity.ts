import {
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
