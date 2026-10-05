import { z } from "zod";
export const approvalRoles = ["FINANCE", "TREASURY", "CFO"] as const;
export type ApprovalRole = (typeof approvalRoles)[number];
export type FindingOutcome = "PASS" | "BLOCK" | "REQUIRE_APPROVAL";
const requirementSchema = z.strictObject({
  role: z.enum(approvalRoles),
  count: z.number().int().min(1).max(5),
  prohibitCreator: z.boolean().default(false),
});
const tierSchema = z.strictObject({
  upperBoundMinor: z.string().regex(/^\d+$/).optional(),
  label: z.string().min(1).max(120),
  requirements: z.array(requirementSchema).min(1),
});
export const policyConfigSchema = z
  .strictObject({
    currency: z.string().regex(/^[A-Z]{3}$/),
    tiers: z.array(tierSchema).min(1).max(5),
    requireVerifiedDestination: z.literal(true),
    newVendorRequiresTreasury: z.boolean(),
  })
  .superRefine((config, context) => {
    let previous = 0n;
    config.tiers.forEach((tier, index) => {
      if (tier.upperBoundMinor === undefined) {
        if (index !== config.tiers.length - 1)
          context.addIssue({
            code: "custom",
            message: "Only the final policy tier may be unbounded",
            path: ["tiers", index, "upperBoundMinor"],
          });
        return;
      }
      const bound = BigInt(tier.upperBoundMinor);
      if (bound <= previous)
        context.addIssue({
          code: "custom",
          message: "Policy tier bounds must increase",
          path: ["tiers", index, "upperBoundMinor"],
        });
      previous = bound;
    });
    if (config.tiers.at(-1)?.upperBoundMinor !== undefined)
      context.addIssue({
        code: "custom",
        message: "The final policy tier must be unbounded",
        path: ["tiers"],
      });
  });
export type PolicyConfig = z.infer<typeof policyConfigSchema>;
export const defaultPolicyConfig: PolicyConfig = {
  currency: "USD",
  requireVerifiedDestination: true,
  newVendorRequiresTreasury: true,
  tiers: [
    {
      upperBoundMinor: "100000",
      label: "Under USD 1,000",
      requirements: [{ role: "FINANCE", count: 1, prohibitCreator: false }],
    },
    {
      upperBoundMinor: "1000000",
      label: "USD 1,000–10,000",
      requirements: [
        { role: "FINANCE", count: 1, prohibitCreator: false },
        { role: "TREASURY", count: 1, prohibitCreator: true },
      ],
    },
    {
      label: "Above USD 10,000",
      requirements: [{ role: "TREASURY", count: 2, prohibitCreator: true }],
    },
  ],
};
export interface ControlFinding {
  code: string;
  outcome: FindingOutcome;
  message: string;
  metadata?: Record<string, string | number | boolean>;
}
export interface ApprovalRequirementSpec {
  role: ApprovalRole;
  count: number;
  prohibitCreator: boolean;
  reason: string;
}
export interface PolicyInput {
  amountMinor: bigint;
  currency: string;
  vendorKnown: boolean;
  destinationStatus: "UNVERIFIED" | "VERIFIED_MANUALLY" | "SUPERSEDED" | "NONE";
  duplicateStatus: "CLEAR" | "POSSIBLE_OPEN" | "EXACT_OPEN";
  fieldsComplete: boolean;
}
export function evaluatePolicy(rawConfig: unknown, input: PolicyInput) {
  const config = policyConfigSchema.parse(rawConfig);
  const findings: ControlFinding[] = [];
  findings.push(
    input.fieldsComplete
      ? {
          code: "OBLIGATION_COMPLETE",
          outcome: "PASS",
          message: "Required financial fields are complete.",
        }
      : {
          code: "OBLIGATION_INCOMPLETE",
          outcome: "BLOCK",
          message: "Required financial information is missing.",
        },
  );
  findings.push(
    input.vendorKnown
      ? {
          code: "VENDOR_KNOWN",
          outcome: "PASS",
          message: "Vendor has prior obligation history.",
        }
      : {
          code: "VENDOR_NEW",
          outcome: "REQUIRE_APPROVAL",
          message: "First obligation for this vendor requires stronger review.",
        },
  );
  findings.push(
    input.destinationStatus === "VERIFIED_MANUALLY"
      ? {
          code: "DESTINATION_ACCEPTABLE",
          outcome: "PASS",
          message:
            "The selected destination was manually verified by an authorized actor.",
        }
      : {
          code:
            input.destinationStatus === "NONE"
              ? "DESTINATION_MISSING"
              : "DESTINATION_UNVERIFIED",
          outcome: "BLOCK",
          message:
            input.destinationStatus === "NONE"
              ? "No current vendor destination is available."
              : "The selected destination is not currently verified.",
        },
  );
  findings.push(
    input.duplicateStatus === "CLEAR"
      ? {
          code: "DUPLICATE_CLEAR",
          outcome: "PASS",
          message: "No unresolved duplicate finding remains.",
        }
      : {
          code:
            input.duplicateStatus === "EXACT_OPEN"
              ? "EXACT_DUPLICATE_OPEN"
              : "POSSIBLE_DUPLICATE_OPEN",
          outcome: "BLOCK",
          message: "An unresolved duplicate concern blocks control completion.",
        },
  );
  const requirements: ApprovalRequirementSpec[] = [];
  if (input.currency !== config.currency)
    findings.push({
      code: "POLICY_CURRENCY_UNSUPPORTED",
      outcome: "BLOCK",
      message: `Policy thresholds are denominated in ${config.currency}; ${input.currency} has no approved conversion path.`,
    });
  else {
    const tier = config.tiers.find(
      (candidate) =>
        candidate.upperBoundMinor === undefined ||
        input.amountMinor < BigInt(candidate.upperBoundMinor),
    );
    if (!tier) throw new Error("Policy has no terminal amount tier");
    findings.push({
      code: "AMOUNT_TIER",
      outcome: "REQUIRE_APPROVAL",
      message: tier.label,
      metadata: { amountMinor: input.amountMinor.toString() },
    });
    requirements.push(
      ...tier.requirements.map((requirement) => ({
        ...requirement,
        reason: tier.label,
      })),
    );
  }
  if (!input.vendorKnown && config.newVendorRequiresTreasury) {
    const existing = requirements.find(
      (requirement) => requirement.role === "TREASURY",
    );
    if (existing) existing.prohibitCreator = true;
    else
      requirements.push({
        role: "TREASURY",
        count: 1,
        prohibitCreator: true,
        reason: "First payment to a new vendor",
      });
  }
  return {
    result: findings.some((finding) => finding.outcome === "BLOCK")
      ? ("BLOCKED" as const)
      : ("APPROVAL_REQUIRED" as const),
    findings,
    requirements,
  };
}
export interface ReadinessInput {
  currentObligationVersion: number;
  decisionObligationVersion: number;
  currentPolicyVersionId: string;
  decisionPolicyVersionId: string;
  currentDestinationId: string | null;
  decisionDestinationId: string | null;
  decisionResult: string;
  hasBlockingFindings: boolean;
  hasOpenDuplicates: boolean;
  destinationAcceptable: boolean;
  requirements: readonly {
    state: string;
    approvedCount: number;
    requiredCount: number;
  }[];
  obligationState: string;
}
export interface ReadinessReason {
  code: string;
  message: string;
}
export function evaluateReadiness(input: ReadinessInput) {
  const reasons: ReadinessReason[] = [];
  if (input.currentObligationVersion !== input.decisionObligationVersion)
    reasons.push({
      code: "STALE_OBLIGATION_VERSION",
      message: "The policy decision targets an older obligation version.",
    });
  if (input.currentPolicyVersionId !== input.decisionPolicyVersionId)
    reasons.push({
      code: "STALE_POLICY_VERSION",
      message: "The active policy version changed after evaluation.",
    });
  if (input.currentDestinationId !== input.decisionDestinationId)
    reasons.push({
      code: "DESTINATION_CHANGED",
      message: "The reviewed destination version is no longer current.",
    });
  if (input.decisionResult !== "APPROVAL_REQUIRED" || input.hasBlockingFindings)
    reasons.push({
      code: "CONTROL_BLOCKED",
      message: "The current policy decision contains blocking controls.",
    });
  if (input.hasOpenDuplicates)
    reasons.push({
      code: "DUPLICATE_UNRESOLVED",
      message: "A duplicate concern remains unresolved.",
    });
  if (!input.destinationAcceptable)
    reasons.push({
      code: "DESTINATION_UNVERIFIED",
      message: "The exact reviewed destination is not verified.",
    });
  for (const requirement of input.requirements)
    if (
      requirement.state !== "APPROVED" ||
      requirement.approvedCount < requirement.requiredCount
    )
      reasons.push({
        code: "APPROVAL_REQUIRED",
        message: "A required approval threshold is not satisfied.",
      });
  if (input.obligationState !== "APPROVED")
    reasons.push({
      code: "OBLIGATION_NOT_APPROVED",
      message: "The obligation is not in the APPROVED state.",
    });
  return { ready: reasons.length === 0, reasons };
}
export function transitionControlState(current: string, next: string) {
  const allowed: Record<string, readonly string[]> = {
    UNDER_REVIEW: ["APPROVAL_REQUIRED", "BLOCKED"],
    BLOCKED: ["APPROVAL_REQUIRED", "BLOCKED"],
    APPROVAL_REQUIRED: ["APPROVED", "REJECTED", "UNDER_REVIEW"],
    APPROVED: ["READY_TO_SETTLE", "UNDER_REVIEW"],
    READY_TO_SETTLE: ["UNDER_REVIEW"],
  };
  if (!allowed[current]?.includes(next))
    throw new Error(`Control transition denied: ${current} → ${next}`);
  return next;
}
