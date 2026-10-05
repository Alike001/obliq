import type { SigningHandoff, SettlementState } from "@obliq/domain";

/** Boundary only. Phase 0 provides no wallet, scanner, signer, or broadcaster. */
export interface ZcashPaymentRequestAdapter {
  createZip321Request(handoff: SigningHandoff): Promise<{ uri: string }>;
}

export interface ShieldedSettlementObserver {
  observe(settlementId: string): Promise<
    | { status: "UNAVAILABLE"; reason: string }
    | {
        status: Extract<SettlementState, "DETECTED" | "CONFIRMING" | "SETTLED">;
        confirmations: number;
      }
  >;
}

export interface ExternalTreasurySigner {
  handoff(
    intent: SigningHandoff,
  ): Promise<{ status: "AWAITING_EXTERNAL_SIGNATURE" }>;
}

export const zcashCapability = {
  settlement: "UNAVAILABLE",
  reconciliation: "UNAVAILABLE",
  serverSpendAuthority: "NONE",
} as const;
