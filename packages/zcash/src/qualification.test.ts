import { describe, expect, it } from "vitest";
import {
  buildPublicTestnetQualificationReport,
  qualificationMemoHash,
} from "./qualification";
import { receiverFingerprint, type ObserverScanResult } from "./index";

const receiver = `utest1${"q".repeat(90)}`;
const reference = "obliq:settlement:11111111-1111-4111-8111-111111111111";
const target = {
  network: "testnet" as const,
  receiverFingerprint: receiverFingerprint(receiver),
  memoReferenceHash: qualificationMemoHash(reference),
  expectedAmountZat: 100_000n,
  requiredConfirmations: 3,
};

function scan(overrides: Partial<ObserverScanResult> = {}): ObserverScanResult {
  return {
    status: {
      availability: "AVAILABLE",
      network: "testnet",
      authority: "UFVK_VIEW_ONLY",
      spendingAuthority: false,
      chainTipHeight: 4_500_000,
      fullyScannedHeight: 4_500_000,
    },
    observations: [],
    ...overrides,
  };
}

function observation(confirmations: number) {
  return {
    network: "testnet" as const,
    txid: "ab".repeat(32),
    outputIndex: 0,
    pool: "IRONWOOD" as const,
    amountZat: 100_000n,
    minedHeight: 4_499_998,
    confirmations,
    receiverFingerprint: target.receiverFingerprint,
    memoReference: reference,
    observedAt: new Date("2026-10-07T10:00:00.000Z"),
    observerSource: "qualification-test",
  };
}

describe("public testnet qualification evidence", () => {
  it("keeps an unfunded synchronization proof at ready for funded test", () => {
    const report = buildPublicTestnetQualificationReport({
      mode: "UNFUNDED_SYNCHRONIZATION",
      scan: scan(),
      now: new Date("2026-10-07T10:00:00.000Z"),
    });
    expect(report.classification).toBe("PUBLIC_NETWORK_READY_FOR_FUNDED_TEST");
    expect(report.blockers).toContain("REAL_FUNDED_SHIELDED_PAYMENT_REQUIRED");
    expect(report.checks.exactAmountAndMemo).toBe("NOT_RUN");
  });

  it("requires exact amount, receiver, memo, and confirmations", () => {
    const confirming = buildPublicTestnetQualificationReport({
      mode: "FUNDED_PAYMENT",
      scan: scan({ observations: [observation(2)] }),
      target,
    });
    expect(confirming.classification).toBe("PUBLIC_NETWORK_CONFIRMING");
    expect(confirming.checks.exactAmountAndMemo).toBe(true);
    expect(confirming.checks.confirmationPolicy).toBe(false);

    const verified = buildPublicTestnetQualificationReport({
      mode: "FUNDED_PAYMENT",
      scan: scan({ observations: [observation(3)] }),
      target,
      priorProgression: confirming.progression,
    });
    expect(verified.classification).toBe("PUBLIC_NETWORK_VERIFIED");
    expect(verified.progression).toHaveLength(2);
  });

  it("blocks mismatches and confirmation regression", () => {
    const wrongAmount = {
      ...observation(3),
      amountZat: 99_999n,
    };
    const mismatch = buildPublicTestnetQualificationReport({
      mode: "FUNDED_PAYMENT",
      scan: scan({ observations: [wrongAmount] }),
      target,
    });
    expect(mismatch.classification).toBe("PUBLIC_NETWORK_FUNDED_TEST_BLOCKED");
    expect(mismatch.blockers).toContain("AMOUNT_MISMATCH");

    const regression = buildPublicTestnetQualificationReport({
      mode: "FUNDED_PAYMENT",
      scan: scan({ observations: [observation(2)] }),
      target,
      priorProgression: [
        {
          observedAt: "2026-10-07T10:00:00.000Z",
          chainTipHeight: 4_500_000,
          fullyScannedHeight: 4_500_000,
          confirmations: 3,
          reconciliationState: "SETTLED",
        },
      ],
    });
    expect(regression.blockers).toContain(
      "CONFIRMATION_REGRESSION_REVIEW_REQUIRED",
    );
    expect(regression.classification).not.toBe("PUBLIC_NETWORK_VERIFIED");
  });

  it("does not serialize raw viewing authority, receiver, or memo", () => {
    const report = buildPublicTestnetQualificationReport({
      mode: "FUNDED_PAYMENT",
      scan: scan({ observations: [observation(3)] }),
      target,
    });
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain(receiver);
    expect(serialized).not.toContain(reference);
    expect(serialized).not.toMatch(/uview(?:test)?1/iu);
  });

  it("fails closed when authority or network identity is unproven", () => {
    const report = buildPublicTestnetQualificationReport({
      mode: "UNFUNDED_SYNCHRONIZATION",
      scan: scan({
        status: {
          availability: "AVAILABLE",
          network: "mainnet",
          chainTipHeight: 3_000_000,
          fullyScannedHeight: 3_000_000,
        },
      }),
    });
    expect(report.classification).toBe("PUBLIC_NETWORK_FUNDED_TEST_BLOCKED");
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        "NETWORK_IDENTITY_MISMATCH",
        "READ_ONLY_AUTHORITY_NOT_PROVEN",
      ]),
    );
  });
});
