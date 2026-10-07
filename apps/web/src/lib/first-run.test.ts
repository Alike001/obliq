import { describe, expect, it } from "vitest";
import {
  firstRunSteps,
  nextFirstRunStep,
  waitingFirstRunStep,
} from "./first-run";

const state = (steps: ReturnType<typeof firstRunSteps>) =>
  Object.fromEntries(steps.map((step) => [step.id, step.state]));

const destination = (
  verificationStatus: string,
  supersededAt: Date | null = null,
  vendorId = "v1",
) => ({ vendorId, verificationStatus, supersededAt });

describe("first-run steps", () => {
  it("starts with adding a vendor and blocks what depends on one", () => {
    const steps = firstRunSteps({
      role: "OWNER",
      vendorIds: [],
      destinations: [],
      policyCount: 0,
    });
    expect(state(steps)).toEqual({
      vendor: "next",
      destination: "blocked",
      verification: "blocked",
      policy: "next",
      obligation: "blocked",
    });
    expect(nextFirstRunStep(steps)?.id).toBe("vendor");
  });

  it("does not count a recorded destination as verified", () => {
    const steps = firstRunSteps({
      role: "OWNER",
      vendorIds: ["v1"],
      destinations: [destination("UNVERIFIED")],
      policyCount: 1,
    });
    expect(state(steps)).toMatchObject({
      destination: "done",
      verification: "next",
    });
    expect(steps[2]?.blocker).toMatch(/not verified/);
    expect(steps[2]?.action?.href).toBe("/app/vendors/v1");
    expect(nextFirstRunStep(steps)?.id).toBe("verification");
  });

  it.each(["PENDING", "VERIFIED", "SUPERSEDED"])(
    "treats %s as not verified, matching what policy accepts",
    (status) => {
      const steps = firstRunSteps({
        role: "OWNER",
        vendorIds: ["v1"],
        destinations: [destination(status)],
        policyCount: 1,
      });
      expect(state(steps).verification).not.toBe("done");
    },
  );

  it("ignores a verified destination that has been superseded", () => {
    const steps = firstRunSteps({
      role: "OWNER",
      vendorIds: ["v1"],
      destinations: [
        destination("VERIFIED_MANUALLY", new Date("2026-10-01")),
        destination("UNVERIFIED"),
      ],
      policyCount: 1,
    });
    expect(state(steps).verification).toBe("next");
  });

  it("marks verification done only for a current, manually verified destination", () => {
    const steps = firstRunSteps({
      role: "FINANCE",
      vendorIds: ["v1"],
      destinations: [destination("VERIFIED_MANUALLY")],
      policyCount: 1,
    });
    expect(state(steps)).toEqual({
      vendor: "done",
      destination: "done",
      verification: "done",
      policy: "done",
      obligation: "next",
    });
    expect(steps[4]?.blocker).toBeUndefined();
  });

  it("shows who must act when the role cannot verify or set policy", () => {
    const steps = firstRunSteps({
      role: "FINANCE",
      vendorIds: ["v1"],
      destinations: [destination("UNVERIFIED")],
      policyCount: 0,
    });
    expect(state(steps)).toMatchObject({
      verification: "waiting",
      policy: "waiting",
    });
    expect(steps[2]?.blocker).toMatch(/Owner, CFO or Treasury/);
    expect(steps[3]?.blocker).toMatch(/Policy Administrator/);
    expect(nextFirstRunStep(steps)?.id).toBe("obligation");
    expect(steps[4]?.blocker).toMatch(/policy will block/);
  });

  it("names the responsible party on every open step, and on no other", () => {
    const steps = firstRunSteps({
      role: "FINANCE",
      vendorIds: ["v1"],
      destinations: [destination("UNVERIFIED")],
      policyCount: 0,
    });
    expect(steps.map((step) => step.responsible)).toEqual([
      undefined,
      undefined,
      "An Owner, CFO or Treasury member",
      "An Owner, CFO or Policy Administrator",
      "You",
    ]);
    expect(waitingFirstRunStep(steps)?.id).toBe("verification");
    const blocked = firstRunSteps({
      role: "OWNER",
      vendorIds: [],
      destinations: [],
      policyCount: 0,
    });
    expect(blocked[1]?.responsible).toBeUndefined();
    expect(waitingFirstRunStep(blocked)).toBeUndefined();
  });

  it("points the destination step at the vendor that has none", () => {
    const steps = firstRunSteps({
      role: "OWNER",
      vendorIds: ["v1", "v2"],
      destinations: [destination("VERIFIED_MANUALLY", null, "v1")],
      policyCount: 1,
    });
    expect(steps[1]?.state).toBe("done");
    expect(steps[1]?.action?.href).toBe("/app/vendors/v2");
  });
});
