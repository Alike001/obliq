import { formatMinorUnits, parseMoneyInput } from "@obliq/domain";
import {
  defaultPolicyConfig,
  evaluatePolicy,
  evaluateReadiness,
  type ApprovalRole,
} from "@obliq/policy";

export type DemoDuplicateStatus = "CLEAR" | "POSSIBLE_OPEN" | "EXACT_OPEN";

export interface DemoInputs {
  amount: string;
  vendorKnown: boolean;
  fieldsComplete: boolean;
  duplicateStatus: DemoDuplicateStatus;
  recipientConfirmed: boolean;
  destinationReviewed: boolean;
}

export type DemoApprovalCounts = Partial<Record<ApprovalRole, number>>;

export const initialDemoInputs: DemoInputs = {
  amount: "2750.00",
  vendorKnown: true,
  fieldsComplete: true,
  duplicateStatus: "CLEAR",
  recipientConfirmed: true,
  destinationReviewed: false,
};

export const initialDemoApprovalCounts: DemoApprovalCounts = {};

export function evaluateDemoPolicy(
  inputs: DemoInputs,
  approvals: DemoApprovalCounts,
) {
  const money = parseMoneyInput(inputs.amount, "USD");
  const destinationStatus = inputs.destinationReviewed
    ? "VERIFIED_MANUALLY"
    : inputs.recipientConfirmed
      ? "UNVERIFIED"
      : "NONE";
  const decision = evaluatePolicy(defaultPolicyConfig, {
    amountMinor: money.amountMinor,
    currency: money.currency,
    vendorKnown: inputs.vendorKnown,
    destinationStatus,
    duplicateStatus: inputs.duplicateStatus,
    fieldsComplete: inputs.fieldsComplete,
  });
  const requirements = decision.requirements.map((requirement) => {
    const approvedCount = Math.min(
      approvals[requirement.role] ?? 0,
      requirement.count,
    );
    return {
      ...requirement,
      requiredCount: requirement.count,
      approvedCount,
      state: approvedCount >= requirement.count ? "APPROVED" : "PENDING",
    };
  });
  const approvalsSatisfied = requirements.every(
    (requirement) => requirement.state === "APPROVED",
  );
  const hasBlockingFindings = decision.findings.some(
    (finding) => finding.outcome === "BLOCK",
  );
  const readiness = evaluateReadiness({
    currentObligationVersion: 1,
    decisionObligationVersion: 1,
    currentPolicyVersionId: "demo-policy-v1",
    decisionPolicyVersionId: "demo-policy-v1",
    currentDestinationId: inputs.destinationReviewed
      ? "demo-destination-v1"
      : null,
    decisionDestinationId: inputs.destinationReviewed
      ? "demo-destination-v1"
      : null,
    decisionResult: decision.result,
    hasBlockingFindings,
    hasOpenDuplicates: inputs.duplicateStatus !== "CLEAR",
    destinationAcceptable: inputs.destinationReviewed,
    requirements,
    obligationState:
      decision.result === "APPROVAL_REQUIRED" && approvalsSatisfied
        ? "APPROVED"
        : "APPROVAL_REQUIRED",
  });

  return {
    amountMinor: money.amountMinor,
    formattedAmount: formatMinorUnits(money.amountMinor, money.currency),
    decision,
    requirements,
    readiness,
    approvalsSatisfied,
    lifecycleState: hasBlockingFindings
      ? ("CONTROL_BLOCKED" as const)
      : readiness.ready
        ? ("READY_TO_SETTLE" as const)
        : ("APPROVAL_REQUIRED" as const),
  };
}
