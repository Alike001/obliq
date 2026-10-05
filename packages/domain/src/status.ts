export const implementationStatuses = [
  "IMPLEMENTED",
  "SEEDED",
  "PLANNED",
  "BLOCKED",
  "UNAVAILABLE",
] as const;

export type ImplementationStatus = (typeof implementationStatuses)[number];

export const obligationStates = [
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
] as const;

export type ObligationState = (typeof obligationStates)[number];

export const settlementStates = [
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
] as const;

export type SettlementState = (typeof settlementStates)[number];

export function isFinalSettlement(state: SettlementState): boolean {
  return state === "SETTLED";
}
