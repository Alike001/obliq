import { describe, expect, it } from "vitest";
import {
  createExternalSignerHandoff,
  createZip321PaymentRequest,
  formatZecAmount,
  memoReferenceHash,
  reconcileObservation,
  receiverFingerprint,
  redactZcashSecrets,
  settlementIntentHash,
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
    expect(zcashCapability.settlementExecution).toBe("EXTERNAL_REGTEST_ONLY");
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

  it.each([
    [1n, "0.00000001"],
    [100_000_000n, "1"],
    [125_000_000n, "1.25"],
    [2_100_000_000_000_000n, "21000000"],
  ])("formats exact zatoshis without floating point", (amount, expected) => {
    expect(formatZecAmount(amount)).toBe(expected);
  });

  it("creates and parses the canonical private ZIP-321 subset", async () => {
    const receiver = `uregtest1${"q".repeat(80)}`;
    const request = createZip321PaymentRequest({
      network: "regtest",
      receiver,
      amountZat: 25_000_000n,
      memoReference: "obliq:v1:opaque-id",
    });
    expect(request).toBe(
      `zcash:${receiver}?amount=0.25&memo=b2JsaXE6djE6b3BhcXVlLWlk`,
    );
    const { parseZip321PaymentRequest } = await import("./index");
    expect(parseZip321PaymentRequest(request, "regtest")).toEqual({
      network: "regtest",
      receiver,
      amountZat: 25_000_000n,
      memoReference: "obliq:v1:opaque-id",
    });
  });

  it("rejects transparent, wrong-network, imprecise, and duplicate requests", async () => {
    const { parseZip321PaymentRequest } = await import("./index");
    expect(() =>
      createZip321PaymentRequest({
        network: "regtest",
        receiver: "tmFakeTransparent",
        amountZat: 1n,
        memoReference: "opaque",
      }),
    ).toThrow("Unified Address");
    expect(() =>
      parseZip321PaymentRequest(
        `zcash:u1${"q".repeat(80)}?amount=0.000000001&memo=b3BhcXVl`,
        "regtest",
      ),
    ).toThrow();
    expect(() =>
      parseZip321PaymentRequest(
        `zcash:uregtest1${"q".repeat(80)}?amount=1&amount=2&memo=b3BhcXVl`,
        "regtest",
      ),
    ).toThrow("duplicate");
  });

  it("binds the external handoff to a FullPrivacy exact intent", () => {
    const handoff = createExternalSignerHandoff({
      intentId: "00000000-0000-4000-8000-000000000099",
      intentHash: "ab".repeat(32),
      network: "regtest",
      receiver: `uregtest1${"q".repeat(80)}`,
      amountZat: 25_000_000n,
      quoteExpiresAt: new Date("2026-10-06T12:00:00Z"),
    });
    expect(handoff.privacyPolicy).toBe("FullPrivacy");
    expect(handoff.amountZat).toBe("25000000");
    expect(JSON.stringify(handoff)).not.toMatch(/vendor|invoice|approval/iu);
  });

  it("changes the intent fingerprint for every material authorization field", () => {
    const binding = {
      organizationId: "org",
      obligationId: "obligation",
      obligationVersion: 2,
      policyDecisionId: "decision",
      vendorId: "vendor",
      destinationId: "destination",
      destinationReceiver: `uregtest1${"q".repeat(80)}`,
      businessCurrency: "USD",
      businessAmountMinor: "25000",
      quoteId: "quote",
      quoteVersion: 1,
      quoteSource: "REGTEST_FIXED",
      quotedAt: "2026-10-06T08:00:00.000Z",
      quoteExpiresAt: "2026-10-06T09:00:00.000Z",
      amountZat: "25000000",
      memoReference: "obliq:v1:opaque",
      network: "regtest" as const,
      privacyMode: "SHIELDED" as const,
      intentVersion: 1,
    };
    const expected = settlementIntentHash(binding);
    for (const changed of [
      { ...binding, obligationVersion: 3 },
      { ...binding, destinationId: "substituted" },
      { ...binding, businessAmountMinor: "25001" },
      { ...binding, amountZat: "25000001" },
      { ...binding, memoReference: "obliq:v1:tampered" },
      { ...binding, quoteExpiresAt: "2026-10-06T10:00:00.000Z" },
    ])
      expect(settlementIntentHash(changed)).not.toBe(expected);
  });
});
