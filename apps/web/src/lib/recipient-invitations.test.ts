import { describe, expect, it } from "vitest";
import {
  canIssueInvitations,
  canReviewDestinations,
  invitationCanBeRevoked,
  invitationBlockers,
  invitationStateDetail,
  invitationStateLabel,
  isRecipientSubmitted,
  parseIssueReply,
  parseRevokeReply,
  revocationReasons,
} from "./recipient-invitations";

describe("who may act", () => {
  it("offers invitations to Owner, CFO and Finance only", () => {
    for (const role of ["OWNER", "CFO", "FINANCE"])
      expect(canIssueInvitations(role)).toBe(true);
    for (const role of ["TREASURY", "APPROVER", "VIEWER", ""])
      expect(canIssueInvitations(role)).toBe(false);
  });

  it("keeps destination review with Owner, CFO and Treasury", () => {
    for (const role of ["OWNER", "CFO", "TREASURY"])
      expect(canReviewDestinations(role)).toBe(true);
    expect(canReviewDestinations("FINANCE")).toBe(false);
  });
});

describe("invitation blockers", () => {
  const ready = {
    role: "FINANCE",
    hasVendor: true,
    hasContactEmail: true,
    obligationState: "UNDER_REVIEW",
  };

  it("finds none when the server's preconditions hold", () => {
    expect(invitationBlockers(ready)).toEqual([]);
  });

  it("names each precondition the server would refuse", () => {
    expect(invitationBlockers({ ...ready, role: "TREASURY" })).toEqual([
      "ROLE",
    ]);
    expect(invitationBlockers({ ...ready, hasContactEmail: false })).toEqual([
      "NO_CONTACT",
    ]);
    expect(
      invitationBlockers({
        ...ready,
        hasVendor: false,
        hasContactEmail: false,
      }),
    ).toEqual(["NO_VENDOR"]);
    for (const state of ["SETTLED", "REJECTED", "CANCELLED", "EXPIRED"])
      expect(invitationBlockers({ ...ready, obligationState: state })).toEqual([
        "OBLIGATION_CLOSED",
      ]);
  });
});

describe("persisted invitation states", () => {
  it("names every backend state without implying payment settlement", () => {
    expect(invitationStateLabel).toEqual({
      ACTIVE: "Active",
      CONTACT_VERIFIED: "Contact verified",
      CONSUMED: "Destination submitted",
      EXPIRED: "Expired",
      REVOKED: "Revoked",
      SUPERSEDED: "Replaced",
    });
    for (const detail of Object.values(invitationStateDetail))
      expect(detail).not.toMatch(/paid|settled|wallet ownership/iu);
  });

  it("offers revocation only for the two open persisted states", () => {
    expect(invitationCanBeRevoked("ACTIVE")).toBe(true);
    expect(invitationCanBeRevoked("CONTACT_VERIFIED")).toBe(true);
    for (const state of [
      "CONSUMED",
      "EXPIRED",
      "REVOKED",
      "SUPERSEDED",
    ] as const)
      expect(invitationCanBeRevoked(state)).toBe(false);
  });
});

describe("server replies", () => {
  it("counts an invitation as sent only on 201 ACTIVE", () => {
    const body = {
      invitationId: "0b6f0f4e-3f0e-4b1a-9c55-0d0f6a1f2a10",
      state: "ACTIVE",
      expiresAt: "2026-10-12T12:00:00.000Z",
    };
    expect(parseIssueReply(201, body)?.expiresAt.toISOString()).toBe(
      "2026-10-12T12:00:00.000Z",
    );
    expect(parseIssueReply(200, body)).toBeNull();
    expect(
      parseIssueReply(400, { error: "INVITATION_UNAVAILABLE" }),
    ).toBeNull();
    expect(parseIssueReply(201, { ...body, state: "REVOKED" })).toBeNull();
    expect(parseIssueReply(201, { ...body, expiresAt: "later" })).toBeNull();
    expect(parseIssueReply(201, null)).toBeNull();
  });

  it("separates revoked, nothing to revoke and refused", () => {
    expect(parseRevokeReply(200, { invitationId: "a", state: "REVOKED" })).toBe(
      "REVOKED",
    );
    expect(parseRevokeReply(404, null)).toBe("NOT_OPEN");
    expect(parseRevokeReply(400, { error: "INVITATION_UNAVAILABLE" })).toBe(
      "REFUSED",
    );
    expect(parseRevokeReply(200, { state: "ACTIVE" })).toBe("REFUSED");
    expect(parseRevokeReply(500, null)).toBe("REFUSED");
  });

  it("offers exactly the reason codes the API accepts", () => {
    expect(revocationReasons.map((reason) => reason.code).sort()).toEqual([
      "CONTACT_CHANGED",
      "OTHER",
      "SECURITY_CONCERN",
      "SENT_IN_ERROR",
    ]);
  });
});

describe("destination provenance", () => {
  const manual = {
    origin: "INTERNAL_MANUAL",
    recipientConfirmationStatus: "NONE",
    verificationStatus: "UNVERIFIED",
    supersededAt: null,
  };

  it("recognises an address a recipient submitted", () => {
    expect(isRecipientSubmitted(manual)).toBe(false);
    expect(
      isRecipientSubmitted({ ...manual, origin: "RECIPIENT_INVITATION" }),
    ).toBe(true);
    expect(
      isRecipientSubmitted({
        ...manual,
        recipientConfirmationStatus: "CONTACT_CONFIRMED",
      }),
    ).toBe(true);
  });
});
