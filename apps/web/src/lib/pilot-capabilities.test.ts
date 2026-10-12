import { describe, expect, it } from "vitest";
import { pilotQuotaForMutation } from "./pilot-capabilities";

describe("public pilot mutation capabilities", () => {
  it("allows only persisted fictional capture and control evaluation", () => {
    expect(pilotQuotaForMutation("create-vendor")).toBe("vendor");
    expect(pilotQuotaForMutation("update-vendor")).toBe("mutation");
    expect(pilotQuotaForMutation("create-obligation")).toBe("obligation");
    expect(pilotQuotaForMutation("update-obligation")).toBe("mutation");
    expect(pilotQuotaForMutation("evaluate-controls")).toBe("mutation");
  });

  it.each([
    "mutation",
    "create-reviewed-obligation",
    "invoice-upload",
    "vendor-contact",
    "add-destination",
    "verify-destination",
    "approval",
    "readiness",
    "settlement-intent",
    "signing",
    "broadcast",
    "reconciliation",
    "evidence-preview",
    "evidence-issue",
    "evidence-revoke",
    "recipient-invitation",
  ])("rejects privileged operation %s", (scope) => {
    expect(pilotQuotaForMutation(scope)).toBeNull();
  });
});
