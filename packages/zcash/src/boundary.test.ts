import { describe, expect, it } from "vitest";
import {
  memoReferenceHash,
  reconcileObservation,
  receiverFingerprint,
  redactZcashSecrets,
  type NormalizedShieldedOutput,
  type ObservationTarget,
  type ZcashObserver,
  zcashCapability,
} from "./index";

const target: ObservationTarget = {
  network: "regtest",
  receiverFingerprint: receiverFingerprint("receiver-1"),
  memoReferenceHash: memoReferenceHash("obliq:v1:opaque"),
  expectedAmountZat: 125_000_000n,
  requiredConfirmations: 3,
};
const observed: NormalizedShieldedOutput = {
  network: "regtest",
  txid: "ab".repeat(32),
  outputIndex: 1,
  pool: "IRONWOOD",
  amountZat: 125_000_000n,
  minedHeight: 115,
  confirmations: 1,
  receiverFingerprint: target.receiverFingerprint,
  memoReference: "obliq:v1:opaque",
  observedAt: new Date("2026-10-06T05:30:00Z"),
  observerSource: "librustzcash-0.24.0",
};

describe("read-only Zcash boundary", () => {
  it("exposes no spending operation", () => {
    const methods: (keyof ZcashObserver)[] = ["status", "observe"];
    expect(methods).toEqual(["status", "observe"]);
    expect(zcashCapability.serverSpendAuthority).toBe("NONE");
    expect(zcashCapability.settlementExecution).toBe("UNAVAILABLE");
  });

  it("tracks confirmation progression without changing correlation", () => {
    expect(reconcileObservation(target, observed).state).toBe("CONFIRMING");
    expect(
      reconcileObservation(target, { ...observed, confirmations: 3 }),
    ).toEqual({ correlation: "MATCHED", state: "SETTLED", reasons: [] });
  });

  it("never uses amount as the sole correlation signal", () => {
    expect(
      reconcileObservation(target, { ...observed, memoReference: "wrong" }),
    ).toMatchObject({ correlation: "UNKNOWN_REFERENCE", state: "MISMATCH" });
  });

  it("reports an exact amount mismatch as an exception", () => {
    expect(
      reconcileObservation(target, { ...observed, amountZat: 1n }),
    ).toMatchObject({ correlation: "AMOUNT_MISMATCH", state: "MISMATCH" });
  });

  it("rejects malformed observation values", () => {
    expect(
      reconcileObservation(target, { ...observed, confirmations: -1 }),
    ).toMatchObject({ correlation: "MALFORMED", state: "MISMATCH" });
  });

  it("redacts viewing and spending material", () => {
    const text =
      "uviewregtest1abcdefghijklmnopqrstuvwxyz seed: alpha beta gamma delta spending_key=secret";
    const redacted = redactZcashSecrets(text);
    expect(redacted).not.toContain("uviewregtest1");
    expect(redacted).not.toContain("alpha");
    expect(redacted).not.toContain("secret");
  });
});
