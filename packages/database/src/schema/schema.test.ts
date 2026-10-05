import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  approvalRequirements,
  approvals,
  auditEvents,
  controlFindings,
  duplicateFindings,
  evidencePackages,
  ledgerEntries,
  obligations,
  obligationVersions,
  obligationSources,
  policies,
  policyDecisions,
  policyVersions,
  settlementReadiness,
  vendors,
  vendorDestinations,
  settlements,
} from "./index";

describe("database invariants", () => {
  it.each([
    obligations,
    obligationVersions,
    settlements,
    ledgerEntries,
    evidencePackages,
    auditEvents,
    vendors,
    vendorDestinations,
    obligationSources,
    duplicateFindings,
    policies,
    policyVersions,
    policyDecisions,
    controlFindings,
    approvalRequirements,
    approvals,
    settlementReadiness,
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

  it("binds approvals and readiness to immutable authorization inputs", () => {
    expect(getTableColumns(policyDecisions).policyVersionId.notNull).toBe(true);
    expect(getTableColumns(policyDecisions).obligationVersion.notNull).toBe(
      true,
    );
    expect(getTableColumns(approvals).policyDecisionId.notNull).toBe(true);
    expect(getTableColumns(approvals).obligationVersion.notNull).toBe(true);
    expect(getTableColumns(settlementReadiness).policyDecisionId.notNull).toBe(
      true,
    );
  });
});
