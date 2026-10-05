import { pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";

export const membershipRole = pgEnum("membership_role", [
  "OWNER",
  "FINANCE",
  "APPROVER",
  "SIGNER",
  "ACCOUNTANT",
  "TREASURY",
  "CFO",
  "POLICY_ADMIN",
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
  "VERIFIED_MANUALLY",
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
export const duplicateKind = pgEnum("duplicate_kind", ["POSSIBLE"]);
export const extractionMode = pgEnum("extraction_mode", [
  "LIVE",
  "SEEDED_FIXTURE",
]);
export const extractionStatus = pgEnum("extraction_status", [
  "COMPLETED",
  "FAILED",
]);
export const controlFindingOutcome = pgEnum("control_finding_outcome", [
  "PASS",
  "BLOCK",
  "REQUIRE_APPROVAL",
]);
export const policyDecisionResult = pgEnum("policy_decision_result", [
  "BLOCKED",
  "APPROVAL_REQUIRED",
]);
export const approvalDecision = pgEnum("approval_decision", [
  "APPROVE",
  "REJECT",
]);
export const duplicateResolutionStatus = pgEnum("duplicate_resolution_status", [
  "OPEN",
  "RESOLVED",
]);
export const readinessResult = pgEnum("readiness_result", [
  "READY",
  "NOT_READY",
]);

export const id = () => uuid("id").primaryKey().defaultRandom();
export const organizationId = () => uuid("organization_id").notNull();
export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
