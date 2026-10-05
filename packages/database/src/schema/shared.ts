import { pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";

export const membershipRole = pgEnum("membership_role", [
  "OWNER",
  "FINANCE",
  "APPROVER",
  "SIGNER",
  "ACCOUNTANT",
]);
export const recordStatus = pgEnum("record_status", [
  "ACTIVE",
  "INACTIVE",
  "BLOCKED",
]);
export const verificationStatus = pgEnum("verification_status", [
  "UNVERIFIED",
  "PENDING",
  "VERIFIED",
  "SUPERSEDED",
]);
export const obligationState = pgEnum("obligation_state", [
  "DRAFT",
  "UNDER_REVIEW",
  "APPROVAL_REQUIRED",
  "APPROVED",
  "READY_TO_SETTLE",
  "SETTLEMENT_PREPARED",
  "SIGNING",
  "BROADCAST",
  "CONFIRMING",
  "SETTLED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
  "BLOCKED",
  "SETTLEMENT_FAILED",
  "RECONCILIATION_EXCEPTION",
]);
export const settlementState = pgEnum("settlement_state", [
  "NOT_CREATED",
  "PREPARED",
  "AWAITING_SIGNATURE",
  "SIGNED",
  "BROADCAST",
  "DETECTED",
  "CONFIRMING",
  "SETTLED",
  "FAILED",
  "UNAVAILABLE",
]);
export const approvalState = pgEnum("approval_state", [
  "NOT_REQUIRED",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "INVALIDATED",
]);

export const id = () => uuid("id").primaryKey().defaultRandom();
export const organizationId = () => uuid("organization_id").notNull();
export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
