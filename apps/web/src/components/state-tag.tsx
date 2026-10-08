import type { ObligationState, SettlementState } from "@obliq/domain";

type Tone = "clear" | "hold" | "stop" | "neutral";

// Where a record stands. Anything still moving is "hold"; only a state that
// needs no further action from anyone before the next stage is "clear".
const tones: Record<ObligationState | SettlementState, Tone> = {
  DRAFT: "neutral",
  UNDER_REVIEW: "hold",
  APPROVAL_REQUIRED: "hold",
  APPROVED: "clear",
  READY_TO_SETTLE: "clear",
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

const glyphs: Record<Tone, string> = {
  clear: "glyph glyph-done",
  hold: "glyph glyph-wait",
  stop: "glyph glyph-stop",
  neutral: "glyph",
};

/** `UNDER_REVIEW` reads as "Under review". The stored value is unchanged. */
export function stateLabel(state: string) {
  const words = state.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** State tag for an obligation or settlement: a glyph, a tint and the word. */
export function StateTag({ state }: { state: string }) {
  const tone = (tones as Record<string, Tone>)[state] ?? "neutral";
  return (
    <span className={tone === "neutral" ? "tag" : `tag tag-${tone}`}>
      <span className={glyphs[tone]} aria-hidden />
      {stateLabel(state)}
    </span>
  );
}
