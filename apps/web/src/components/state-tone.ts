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

/** `UNDER_REVIEW` reads as "Under review". The stored value is unchanged. */
export function stateLabel(state: string) {
  const words = state.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** An unknown state is neutral, so it can never read as settled. */
export function stateTone(state: string): Tone {
  return (tones as Record<string, Tone>)[state] ?? "neutral";
}
