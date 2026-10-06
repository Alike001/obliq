import { describe, expect, it } from "vitest";
import { boundedToken, opaqueId, positiveInteger } from "./input-validation";

describe("runtime boundary validation", () => {
  it("accepts opaque UUIDs and rejects path-shaped identifiers", () => {
    expect(opaqueId("00000000-0000-4000-8000-000000000001")).toContain("4000");
    expect(() => opaqueId("../tenant-b")).toThrow("Invalid identifier");
  });

  it("bounds idempotency tokens and exact zatoshi integers", () => {
    expect(boundedToken(" request-1 ", "request")).toBe("request-1");
    expect(() => boundedToken("line\nbreak", "request")).toThrow();
    expect(positiveInteger("100000000", "amount")).toBe(100000000n);
    expect(() => positiveInteger("1.5", "amount")).toThrow();
  });
});
