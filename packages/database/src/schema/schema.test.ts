import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  auditEvents,
  evidencePackages,
  ledgerEntries,
  obligations,
  settlements,
} from "./index";

describe("database invariants", () => {
  it.each([
    obligations,
    settlements,
    ledgerEntries,
    evidencePackages,
    auditEvents,
  ])("tenant-owned financial tables carry organization_id", (table) =>
    expect(getTableColumns(table)).toHaveProperty("organizationId"),
  );

  it("settlements require both an obligation and intent", () => {
    const columns = getTableColumns(settlements);
    expect(columns.obligationId.notNull).toBe(true);
    expect(columns.intentId.notNull).toBe(true);
  });

  it("money columns use bigint representation", () => {
    const amount = getTableColumns(obligations).amountMinor;
    expect(amount.dataType).toBe("bigint");
  });
});
