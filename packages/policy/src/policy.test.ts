import { describe, expect, it } from "vitest";
import {
  defaultPolicyConfig,
  evaluatePolicy,
  evaluateReadiness,
  policyConfigSchema,
  transitionControlState,
} from "./index";
const base = {
  amountMinor: 50000n,
  currency: "USD",
  vendorKnown: true,
  destinationStatus: "VERIFIED_MANUALLY" as const,
  duplicateStatus: "CLEAR" as const,
  fieldsComplete: true,
};
describe("deterministic policy engine", () => {
  it.each([
    [99999n, ["FINANCE"]],
    [100000n, ["FINANCE", "TREASURY"]],
    [1000000n, ["TREASURY"]],
  ])("maps amount %s to approval roles", (amountMinor, roles) =>
    expect(
      evaluatePolicy(defaultPolicyConfig, {
        ...base,
        amountMinor,
      }).requirements.map((r) => r.role),
    ).toEqual(roles),
  );
  it("blocks unsafe inputs", () => {
    const result = evaluatePolicy(defaultPolicyConfig, {
      ...base,
      currency: "EUR",
      fieldsComplete: false,
      destinationStatus: "UNVERIFIED",
      duplicateStatus: "POSSIBLE_OPEN",
    });
    expect(result.result).toBe("BLOCKED");
    expect(
      result.findings.filter((f) => f.outcome === "BLOCK").map((f) => f.code),
    ).toEqual(
      expect.arrayContaining([
        "OBLIGATION_INCOMPLETE",
        "DESTINATION_UNVERIFIED",
        "POSSIBLE_DUPLICATE_OPEN",
        "POLICY_CURRENCY_UNSUPPORTED",
      ]),
    );
  });
  it("strengthens first-vendor approval", () =>
    expect(
      evaluatePolicy(defaultPolicyConfig, { ...base, vendorKnown: false })
        .requirements,
    ).toContainEqual(
      expect.objectContaining({ role: "TREASURY", prohibitCreator: true }),
    ));
  it("rejects unordered or non-terminal policy tiers", () => {
    expect(() =>
      policyConfigSchema.parse({
        ...defaultPolicyConfig,
        tiers: [
          ...defaultPolicyConfig.tiers.slice(0, 2),
          {
            ...defaultPolicyConfig.tiers[2],
            upperBoundMinor: "2000000",
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      policyConfigSchema.parse({
        ...defaultPolicyConfig,
        tiers: [
          defaultPolicyConfig.tiers[1],
          defaultPolicyConfig.tiers[0],
          defaultPolicyConfig.tiers[2],
        ],
      }),
    ).toThrow();
  });
});
describe("readiness", () => {
  const ready = {
    currentObligationVersion: 2,
    decisionObligationVersion: 2,
    currentPolicyVersionId: "p2",
    decisionPolicyVersionId: "p2",
    currentDestinationId: "d1",
    decisionDestinationId: "d1",
    decisionResult: "APPROVAL_REQUIRED",
    hasBlockingFindings: false,
    hasOpenDuplicates: false,
    destinationAcceptable: true,
    requirements: [{ state: "APPROVED", approvedCount: 1, requiredCount: 1 }],
    obligationState: "APPROVED",
  };
  it("rejects stale inputs", () => {
    expect(evaluateReadiness(ready)).toEqual({ ready: true, reasons: [] });
    expect(
      evaluateReadiness({ ...ready, currentObligationVersion: 3 }).reasons[0]
        ?.code,
    ).toBe("STALE_OBLIGATION_VERSION");
  });
  it("preserves lifecycle boundaries", () => {
    expect(transitionControlState("APPROVED", "READY_TO_SETTLE")).toBe(
      "READY_TO_SETTLE",
    );
    expect(() =>
      transitionControlState("UNDER_REVIEW", "READY_TO_SETTLE"),
    ).toThrow();
  });
});
