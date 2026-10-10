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
  settlementObservations,
  settlementObservationTargets,
  vendors,
  vendorDestinations,
  settlements,
  recipientInvitations,
  recipientSessions,
  recipientVerificationChallenges,
  recipientOperationReceipts,
  destinationAttestations,
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
    settlementObservations,
    settlementObservationTargets,
    recipientInvitations,
    recipientSessions,
    recipientVerificationChallenges,
    recipientOperationReceipts,
    destinationAttestations,
  ])("tenant-owned financial tables carry organization_id", (table) =>
    expect(getTableColumns(table)).toHaveProperty("organizationId"),
  );

  it("settlements require both an obligation and intent", () => {
    const columns = getTableColumns(settlements);
    expect(columns.obligationId.notNull).toBe(true);
    expect(columns.intentId.notNull).toBe(true);
    expect(columns.networkFeeZat.dataType).toBe("bigint");
  });

  it("money columns use bigint representation", () => {
    const amount = getTableColumns(obligations).amountMinor;
    expect(amount.dataType).toBe("bigint");
  });

  it("observation records require an obligation and contain no viewing key", () => {
    const columns = getTableColumns(settlementObservations);
    expect(columns.obligationId.notNull).toBe(true);
    expect(columns.observedAmountZat.dataType).toBe("bigint");
    expect(columns).not.toHaveProperty("viewingKey");
    expect(columns).not.toHaveProperty("memoPlaintext");
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

  it("stores only hashed recipient credentials and immutable destination versions", () => {
    const invitation = getTableColumns(recipientInvitations);
    const session = getTableColumns(recipientSessions);
    const challenge = getTableColumns(recipientVerificationChallenges);
    expect(invitation).toHaveProperty("tokenHash");
    expect(invitation).not.toHaveProperty("token");
    expect(session).toHaveProperty("tokenHash");
    expect(session).not.toHaveProperty("token");
    expect(challenge).toHaveProperty("codeHash");
    expect(challenge).not.toHaveProperty("code");
    expect(getTableColumns(vendorDestinations).version.notNull).toBe(true);
  });
});
