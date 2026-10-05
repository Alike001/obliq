import { describe, expect, it } from "vitest";
import {
  classifyDuplicate,
  parseMoneyInput,
  transitionPhaseOneObligation,
  validateObligationInput,
} from "./index";

describe("money input", () => {
  it.each([
    ["12", 1200n],
    ["12.3", 1230n],
    ["12.30", 1230n],
    ["0", 0n],
  ])("parses %s exactly", (input, expected) => {
    expect(parseMoneyInput(input, "USD").amountMinor).toBe(expected);
  });
  it.each(["-1", "1.001", "1e3", "NaN", "", " 1,000 "])(
    "rejects malformed amount %s",
    (input) => {
      expect(() => parseMoneyInput(input, "USD")).toThrow();
    },
  );
  it("supports the PostgreSQL bigint ceiling and rejects overflow", () => {
    expect(parseMoneyInput("92233720368547758.07", "USD").amountMinor).toBe(
      9_223_372_036_854_775_807n,
    );
    expect(() => parseMoneyInput("92233720368547758.08", "USD")).toThrow(
      "range",
    );
  });
});

describe("obligation aggregate", () => {
  it("validates supported types and exact money", () => {
    const result = validateObligationInput({
      vendorId: "00000000-0000-4000-8000-000000000010",
      type: "VENDOR_INVOICE",
      reference: "INV-1",
      currency: "usd",
      amount: "42.10",
      dueDate: "2026-11-01",
      description: "October services",
    });
    expect(result.amountMinor).toBe(4210n);
    expect(result.currency).toBe("USD");
  });
  it("stops before approval functionality", () => {
    expect(transitionPhaseOneObligation("DRAFT", "UNDER_REVIEW")).toBe(
      "UNDER_REVIEW",
    );
    expect(() =>
      transitionPhaseOneObligation("UNDER_REVIEW", "APPROVAL_REQUIRED"),
    ).toThrow("Phase 1");
  });
});

describe("duplicate classification", () => {
  const candidate = {
    id: "one",
    vendorId: "vendor-a",
    reference: "INV-100",
    currency: "USD",
    amountMinor: 1200n,
    sourceHash: "abc",
  };
  it("blocks identical documents or full business keys", () => {
    expect(classifyDuplicate({ ...candidate }, candidate).kind).toBe("EXACT");
    expect(
      classifyDuplicate({ ...candidate, sourceHash: null }, candidate).kind,
    ).toBe("EXACT");
  });
  it("flags similar records and clears unrelated records", () => {
    expect(
      classifyDuplicate(
        { ...candidate, reference: "INV-101", sourceHash: null },
        candidate,
      ).kind,
    ).toBe("POSSIBLE");
    expect(
      classifyDuplicate(
        {
          vendorId: "vendor-b",
          reference: "OTHER",
          currency: "EUR",
          amountMinor: 10n,
        },
        candidate,
      ).kind,
    ).toBe("NONE");
  });
});
