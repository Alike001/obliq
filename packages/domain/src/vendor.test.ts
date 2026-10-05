import { describe, expect, it } from "vitest";
import { destinationInputSchema, vendorInputSchema } from "./vendor";

describe("vendor domain", () => {
  it("accepts useful operational identity without requiring CRM data", () => {
    expect(
      vendorInputSchema.parse({
        legalName: "Northstar Systems Limited",
        displayName: "Northstar",
        category: "Security",
        contactEmail: "finance@northstar.test",
      }).displayName,
    ).toBe("Northstar");
  });

  it("rejects malformed contact data and unsupported destination networks", () => {
    expect(
      vendorInputSchema.safeParse({
        legalName: "Northstar Systems Limited",
        displayName: "Northstar",
        contactEmail: "not-email",
      }).success,
    ).toBe(false);
    expect(
      destinationInputSchema.safeParse({
        network: "ETHEREUM",
        receiver: "0x0000000000000000000000000000000000000000",
      }).success,
    ).toBe(false);
  });
});
