/**
 * First-run progress for the workspace overview.
 *
 * Pure presentation logic over records the caller has already read with
 * tenant-scoped repository functions. It decides nothing about authorization:
 * the role lists below only choose which hint to show, and the server actions
 * remain the authority on who may verify a destination or change policy.
 */

export interface FirstRunDestination {
  vendorId: string;
  verificationStatus: string;
  supersededAt: Date | null;
}

export interface FirstRunInput {
  role: string;
  vendorIds: readonly string[];
  destinations: readonly FirstRunDestination[];
  policyCount: number;
}

export type FirstRunState = "done" | "next" | "blocked" | "waiting";

export interface FirstRunStep {
  id: "vendor" | "destination" | "verification" | "policy" | "obligation";
  title: string;
  text: string;
  state: FirstRunState;
  /** Why the step cannot be done yet, or what will go wrong if it is skipped. */
  blocker?: string;
  /** Who can do an open step: the signed-in person, or the roles that can. */
  responsible?: string;
  action?: { label: string; href: string };
}

const verifierRoles = ["OWNER", "CFO", "TREASURY"];
const policyRoles = ["OWNER", "CFO", "POLICY_ADMIN"];
const verifiers = "An Owner, CFO or Treasury member";
const policyAdmins = "An Owner, CFO or Policy Administrator";

/** Policy passes a destination only when it is current and manually verified. */
function isVerified(destination: FirstRunDestination) {
  return (
    destination.supersededAt === null &&
    destination.verificationStatus === "VERIFIED_MANUALLY"
  );
}

export function firstRunSteps(input: FirstRunInput): FirstRunStep[] {
  const current = input.destinations.filter(
    (destination) => destination.supersededAt === null,
  );
  const hasVendor = input.vendorIds.length > 0;
  const hasDestination = current.length > 0;
  const hasVerified = current.some(isVerified);
  const hasPolicy = input.policyCount > 0;
  const canVerify = verifierRoles.includes(input.role);
  const canSetPolicy = policyRoles.includes(input.role);

  const vendorWithoutDestination = input.vendorIds.find(
    (id) => !current.some((destination) => destination.vendorId === id),
  );
  const unverified = current.find((destination) => !isVerified(destination));
  const vendorHref = (id: string | undefined) =>
    id ? `/app/vendors/${id}` : "/app/vendors";

  const steps: FirstRunStep[] = [
    {
      id: "vendor",
      title: "Add a vendor",
      text: "Every bill is owed to someone. Start with one vendor record.",
      state: hasVendor ? "done" : "next",
      action: { label: "Add a vendor", href: "/app/vendors/new" },
    },
    {
      id: "destination",
      title: "Record the vendor's payment destination",
      text: "Save the shielded receiver the vendor wants to be paid at.",
      state: hasDestination ? "done" : hasVendor ? "next" : "blocked",
      ...(hasVendor ? {} : { blocker: "Add a vendor first." }),
      action: {
        label: "Record a destination",
        href: vendorHref(vendorWithoutDestination),
      },
    },
    {
      id: "verification",
      title: "Verify the destination",
      text: "Record how you confirmed the receiver with the vendor. A recorded destination is not a verified one.",
      state: hasVerified
        ? "done"
        : !hasDestination
          ? "blocked"
          : canVerify
            ? "next"
            : "waiting",
      ...(hasVerified
        ? {}
        : !hasDestination
          ? { blocker: "Record a destination first." }
          : canVerify
            ? {
                blocker:
                  "Recorded but not verified. Policy blocks a bill until verification is recorded.",
              }
            : {
                blocker: `Recorded but not verified. ${verifiers} must record the verification.`,
              }),
      action: {
        label: "Verify the destination",
        href: vendorHref(unverified?.vendorId),
      },
    },
    {
      id: "policy",
      title: "Set the payment policy",
      text: "Amount tiers decide who must approve each bill.",
      state: hasPolicy ? "done" : canSetPolicy ? "next" : "waiting",
      ...(hasPolicy || canSetPolicy
        ? {}
        : {
            blocker: `No active policy. ${policyAdmins} must install one.`,
          }),
      action: { label: "Open policies", href: "/app/policies" },
    },
    {
      id: "obligation",
      title: "Record your first obligation",
      text: "Enter the bill, evaluate policy, and collect the approvals it asks for.",
      state: hasVendor ? "next" : "blocked",
      ...(!hasVendor
        ? { blocker: "Add a vendor first." }
        : !hasVerified
          ? {
              blocker:
                "You can record it now, but policy will block it until the destination is verified.",
            }
          : !hasPolicy
            ? {
                blocker:
                  "You can record it now, but it cannot be evaluated until a policy is active.",
              }
            : {}),
      action: { label: "Record an obligation", href: "/app/obligations/new" },
    },
  ];
  const waitingOn = { verification: verifiers, policy: policyAdmins };
  return steps.map((step) =>
    step.state === "next"
      ? { ...step, responsible: "You" }
      : step.state === "waiting" && step.id in waitingOn
        ? {
            ...step,
            responsible: waitingOn[step.id as keyof typeof waitingOn],
          }
        : step,
  );
}

/** The first step this person can act on now, in order. */
export function nextFirstRunStep(steps: readonly FirstRunStep[]) {
  return steps.find((step) => step.state === "next");
}

/** The first step that is waiting on another role, when one is. */
export function waitingFirstRunStep(steps: readonly FirstRunStep[]) {
  return steps.find((step) => step.state === "waiting");
}
