/**
 * Workspace-side rules for issuing and following recipient invitations.
 *
 * The workspace has no endpoint that reads an invitation's current state, so
 * this module works from two things it is allowed to see: the reply to its
 * own create or revoke request, and the invitation-created events already in
 * the obligation's audit history. It reports what those prove and no more.
 */
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

/**
 * What the audit history proves about one invitation.
 *
 * - `PAST_EXPIRY`: its expiry has passed, so it cannot be used.
 * - `CLOSED`: a later invitation exists. Sending one closes any earlier link
 *   to the same vendor that was still open.
 * - `STATE_NOT_READABLE`: it was created and has not reached its expiry.
 *   Whether it was delivered, used, revoked or replaced is not available here.
 */
export type InvitationStanding =
  "PAST_EXPIRY" | "CLOSED" | "STATE_NOT_READABLE";

export interface IssuedInvitation {
  id: string;
  issuedAt: Date;
  expiresAt: Date | null;
  issuedBy: string | null;
  standing: InvitationStanding;
}

export interface ActivityEvent {
  eventType: string;
  subjectType: string;
  subjectId: string;
  actorId: string | null;
  payloadJson: unknown;
  createdAt: Date;
}

function expiryOf(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const value = (payload as Record<string, unknown>).expiresAt;
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Invitations sent for one obligation, newest first, read from its audit. */
export function issuedInvitations(
  activity: readonly ActivityEvent[],
  now: Date,
): IssuedInvitation[] {
  const sent = activity
    .filter(
      (event) =>
        event.eventType === "RECIPIENT_INVITATION_CREATED" &&
        event.subjectType === "RECIPIENT_INVITATION",
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return sent.map((event, index) => {
    const expiresAt = expiryOf(event.payloadJson);
    const standing: InvitationStanding =
      index > 0
        ? "CLOSED"
        : expiresAt && expiresAt.getTime() <= now.getTime()
          ? "PAST_EXPIRY"
          : "STATE_NOT_READABLE";
    return {
      id: event.subjectId,
      issuedAt: event.createdAt,
      expiresAt,
      issuedBy: event.actorId,
      standing,
    };
  });
}

export const standingLabel: Record<InvitationStanding, string> = {
  PAST_EXPIRY: "Past expiry",
  CLOSED: "Closed",
  STATE_NOT_READABLE: "Issued",
};

export const standingDetail: Record<InvitationStanding, string> = {
  PAST_EXPIRY: "Its 24 hours have passed, so the link no longer works.",
  CLOSED:
    "A later invitation was created. That closed this one if it was still open.",
  STATE_NOT_READABLE:
    "Within its 24 hours. Whether it was delivered, or has since been used, revoked or replaced by a link for another obligation, is not shown here.",
};

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
