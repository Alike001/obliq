import type { ObligationState, SettlementState } from "@obliq/domain";

export type Tone = "clear" | "ready" | "hold" | "stop" | "neutral";

// Where a record stands. Only a settled payment is "clear". An approved
// obligation has passed a gate but has not been paid, so it is "ready" and
// never shares the settled look. Anything still moving is "hold".
const tones: Record<ObligationState | SettlementState, Tone> = {
  DRAFT: "neutral",
  UNDER_REVIEW: "hold",
  APPROVAL_REQUIRED: "hold",
  APPROVED: "ready",
  READY_TO_SETTLE: "ready",
  SETTLEMENT_PREPARED: "hold",
  SIGNING: "hold",
  BROADCAST: "hold",
  CONFIRMING: "hold",
  SETTLED: "clear",
  REJECTED: "stop",
  CANCELLED: "neutral",
  EXPIRED: "neutral",
  BLOCKED: "stop",
  SETTLEMENT_FAILED: "stop",
  RECONCILIATION_EXCEPTION: "stop",
  NOT_CREATED: "neutral",
  PREPARED: "hold",
  AWAITING_SIGNATURE: "hold",
  SIGNED: "hold",
  DETECTED: "hold",
  FAILED: "stop",
  UNAVAILABLE: "neutral",
};

// Words used by other records: destinations, approval requirements, control
// findings, readiness, duplicate findings and evidence packages. A word that
// is also an obligation or settlement state keeps the tone it has above.
const recordTones: Record<string, Tone> = {
  UNVERIFIED: "hold",
  PENDING: "hold",
  VERIFIED: "clear",
  VERIFIED_MANUALLY: "clear",
  SUPERSEDED: "neutral",
  ACTIVE: "clear",
  INACTIVE: "neutral",
  REVOKED: "stop",
  PREVIEW: "hold",
  PASS: "clear",
  BLOCK: "stop",
  REQUIRE_APPROVAL: "hold",
  NOT_REQUIRED: "neutral",
  READY: "ready",
  NOT_READY: "hold",
  OPEN: "hold",
  RESOLVED: "clear",
  INVALIDATED: "neutral",
  BROADCAST_UNKNOWN: "hold",
};

/** `UNDER_REVIEW` reads as "Under review". The stored value is unchanged. */
export function stateLabel(state: string) {
  const words = state.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** An unknown state is neutral, so it can never read as settled. */
export function stateTone(state: string): Tone {
  return (
    (tones as Record<string, Tone>)[state] ?? recordTones[state] ?? "neutral"
  );
}
