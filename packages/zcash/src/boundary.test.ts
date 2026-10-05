import { describe, expect, it } from "vitest";
import { zcashCapability } from "./index";

describe("Phase 0 Zcash boundary", () => {
  it("cannot imply chain functionality or server spending authority", () => {
    expect(zcashCapability).toEqual({
      settlement: "UNAVAILABLE",
      reconciliation: "UNAVAILABLE",
      serverSpendAuthority: "NONE",
    });
  });
});
