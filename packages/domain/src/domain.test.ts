import { describe, expect, it } from "vitest";
import {
  isFinalSettlement,
  money,
  requireSameOrganization,
  zatoshi,
} from "./index";
import type { OrganizationId, TenantContext } from "./index";

describe("financial invariants", () => {
  it("represents money and ZEC settlement amounts with bigint", () => {
    expect(money("USD", 125_050n).amountMinor).toBe(125_050n);
    expect(zatoshi(42_000_000n)).toBe(42_000_000n);
    expect(() => money("USD", -1n)).toThrow("negative");
  });

  it("does not mistake broadcast for settlement", () => {
    expect(isFinalSettlement("BROADCAST")).toBe(false);
    expect(isFinalSettlement("UNAVAILABLE")).toBe(false);
    expect(isFinalSettlement("SETTLED")).toBe(true);
  });
});

describe("tenant boundary", () => {
  const context: TenantContext = {
    organizationId: "org-a" as OrganizationId,
    userId: "user-a" as TenantContext["userId"],
    role: "OWNER",
  };

  it("rejects cross-organization resource access", () => {
    expect(() =>
      requireSameOrganization(context, "org-b" as OrganizationId),
    ).toThrow("Cross-organization");
  });
});
