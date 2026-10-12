import { describe, expect, it } from "vitest";
import {
  evaluateDemoPolicy,
  initialDemoInputs,
  type DemoApprovalCounts,
} from "./demo-policy";

describe("judge demo policy model", () => {
  it("uses the real amount tier and blocks an unreviewed destination", () => {
    const result = evaluateDemoPolicy(initialDemoInputs, {});
    expect(result.formattedAmount).toBe("USD 2,750.00");
    expect(result.decision.result).toBe("BLOCKED");
    expect(result.decision.findings).toContainEqual(
      expect.objectContaining({
        code: "DESTINATION_UNVERIFIED",
        outcome: "BLOCK",
      }),
    );
    expect(result.readiness.ready).toBe(false);
  });

  it("derives role requirements and readiness from reviewed inputs", () => {
    const inputs = { ...initialDemoInputs, destinationReviewed: true };
    const pending = evaluateDemoPolicy(inputs, {});
    expect(pending.decision.result).toBe("APPROVAL_REQUIRED");
    expect(pending.requirements.map(({ role }) => role)).toEqual([
      "FINANCE",
      "TREASURY",
    ]);
    expect(pending.readiness.ready).toBe(false);

    const approved: DemoApprovalCounts = { FINANCE: 1, TREASURY: 1 };
    const ready = evaluateDemoPolicy(inputs, approved);
    expect(ready.readiness).toEqual({ ready: true, reasons: [] });
    expect(ready.lifecycleState).toBe("READY_TO_SETTLE");
  });

  it("requires two treasury approvals above USD 10,000", () => {
    const inputs = {
      ...initialDemoInputs,
      amount: "12000.00",
      destinationReviewed: true,
    };
    const one = evaluateDemoPolicy(inputs, { TREASURY: 1 });
    expect(one.requirements).toContainEqual(
      expect.objectContaining({
        role: "TREASURY",
        count: 2,
        approvedCount: 1,
      }),
    );
    expect(one.readiness.ready).toBe(false);
    expect(evaluateDemoPolicy(inputs, { TREASURY: 2 }).readiness.ready).toBe(
      true,
    );
  });

  it.each(["POSSIBLE_OPEN", "EXACT_OPEN"] as const)(
    "keeps %s duplicates blocked",
    (duplicateStatus) => {
      const result = evaluateDemoPolicy(
        {
          ...initialDemoInputs,
          destinationReviewed: true,
          duplicateStatus,
        },
        { FINANCE: 1, TREASURY: 1 },
      );
      expect(result.lifecycleState).toBe("CONTROL_BLOCKED");
      expect(result.readiness.ready).toBe(false);
    },
  );

  it("rejects imprecise or negative money instead of using floating point", () => {
    expect(() =>
      evaluateDemoPolicy({ ...initialDemoInputs, amount: "2.001" }, {}),
    ).toThrow("more than two decimal places");
    expect(() =>
      evaluateDemoPolicy({ ...initialDemoInputs, amount: "-1" }, {}),
    ).toThrow("non-negative decimal amount");
  });
});
