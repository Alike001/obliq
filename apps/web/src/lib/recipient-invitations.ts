/** Workspace-side rules for issuing and following recipient invitations. */
import type { RecipientInvitationRevocationReason } from "@obliq/domain";

const issuerRoles = ["OWNER", "CFO", "FINANCE"];
const reviewerRoles = ["OWNER", "CFO", "TREASURY"];
const closedObligationStates = ["SETTLED", "REJECTED", "CANCELLED", "EXPIRED"];

/** Chooses what to show. The server checks the role again on every request. */
export function canIssueInvitations(role: string) {
  return issuerRoles.includes(role);
}

export function canReviewDestinations(role: string) {
  return reviewerRoles.includes(role);
}

export type InvitationBlocker =
  "ROLE" | "NO_VENDOR" | "NO_CONTACT" | "OBLIGATION_CLOSED";

/** Why the server would refuse an invitation, checked before offering one. */
export function invitationBlockers(input: {
  role: string;
  hasVendor: boolean;
  hasContactEmail: boolean;
  obligationState: string;
}): InvitationBlocker[] {
  const blockers: InvitationBlocker[] = [];
  if (!canIssueInvitations(input.role)) blockers.push("ROLE");
  if (!input.hasVendor) blockers.push("NO_VENDOR");
  else if (!input.hasContactEmail) blockers.push("NO_CONTACT");
  if (closedObligationStates.includes(input.obligationState))
    blockers.push("OBLIGATION_CLOSED");
  return blockers;
}

export const blockerMessage: Record<InvitationBlocker, string> = {
  ROLE: "Your role cannot send or revoke invitations. An Owner, CFO or Finance member can.",
  NO_VENDOR:
    "This obligation has no vendor, so there is no contact to send a link to.",
  NO_CONTACT:
    "The vendor has no contact email on record. A link can only go to an address your organization recorded beforehand.",
  OBLIGATION_CLOSED:
    "This obligation is closed, so it can no longer take a new destination.",
};

export const revocationReasons: readonly {
  code: RecipientInvitationRevocationReason;
  label: string;
}[] = [
  { code: "SENT_IN_ERROR", label: "Sent in error" },
  { code: "CONTACT_CHANGED", label: "The vendor's contact changed" },
  { code: "SECURITY_CONCERN", label: "Security concern" },
  { code: "OTHER", label: "Other" },
];

export type InvitationState =
  | "ACTIVE"
  | "CONTACT_VERIFIED"
  | "CONSUMED"
  | "EXPIRED"
  | "REVOKED"
  | "SUPERSEDED";

export const invitationStateLabel: Record<InvitationState, string> = {
  ACTIVE: "Active",
  CONTACT_VERIFIED: "Contact verified",
  CONSUMED: "Destination submitted",
  EXPIRED: "Expired",
  REVOKED: "Revoked",
  SUPERSEDED: "Replaced",
};

export const invitationStateDetail: Record<InvitationState, string> = {
  ACTIVE: "The link may still be used to request and verify an email code.",
  CONTACT_VERIFIED:
    "The email check passed. Only a still-unexpired verified session can submit one destination.",
  CONSUMED:
    "The recipient submitted a destination. It remains unverified until independent finance review.",
  EXPIRED: "The invitation's 24-hour validity has ended.",
  REVOKED: "An authorized finance administrator revoked this invitation.",
  SUPERSEDED: "A newer invitation replaced this one.",
};

export function invitationCanBeRevoked(state: InvitationState) {
  return state === "ACTIVE" || state === "CONTACT_VERIFIED";
}

export interface IssueResult {
  invitationId: string;
  state: "ACTIVE";
  expiresAt: Date;
}

/** Reads the create reply. Anything short of `201 ACTIVE` is not a send. */
export function parseIssueReply(
  status: number,
  body: unknown,
): IssueResult | null {
  if (status !== 201 || !body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  if (
    typeof value.invitationId !== "string" ||
    value.state !== "ACTIVE" ||
    typeof value.expiresAt !== "string"
  )
    return null;
  const expiresAt = new Date(value.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) return null;
  return { invitationId: value.invitationId, state: "ACTIVE", expiresAt };
}

/**
 * - `REVOKED`: the server closed it just now.
 * - `NOT_OPEN`: nothing to revoke. It was already used, revoked, replaced or
 *   expired, or it is not one of this organization's invitations.
 * - `REFUSED`: the request was rejected and nothing changed.
 */
export type RevokeResult = "REVOKED" | "NOT_OPEN" | "REFUSED";

export function parseRevokeReply(status: number, body: unknown): RevokeResult {
  if (status === 404) return "NOT_OPEN";
  if (
    status === 200 &&
    body &&
    typeof body === "object" &&
    (body as Record<string, unknown>).state === "REVOKED"
  )
    return "REVOKED";
  return "REFUSED";
}

export interface DestinationProvenance {
  origin: string;
  recipientConfirmationStatus: string;
  verificationStatus: string;
  supersededAt: Date | null;
}

/** True for an address a recipient submitted through an invitation. */
export function isRecipientSubmitted(destination: DestinationProvenance) {
  return (
    destination.origin === "RECIPIENT_INVITATION" ||
    destination.recipientConfirmationStatus === "CONTACT_CONFIRMED"
  );
}
