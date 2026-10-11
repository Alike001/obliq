import { describe, expect, it } from "vitest";
import {
  type ActivityEvent,
  canIssueInvitations,
  canReviewDestinations,
  invitationBlockers,
  isRecipientSubmitted,
  issuedInvitations,
  parseIssueReply,
  parseRevokeReply,
  revocationReasons,
  standingDetail,
  standingLabel,
} from "./recipient-invitations";

const created = (
  subjectId: string,
  createdAt: string,
  expiresAt: unknown,
): ActivityEvent => ({
  eventType: "RECIPIENT_INVITATION_CREATED",
  subjectType: "RECIPIENT_INVITATION",
  subjectId,
  actorId: "00000000-0000-4000-8000-000000000001",
  payloadJson: { obligationId: "obligation", expiresAt },
  createdAt: new Date(createdAt),
});

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

describe("invitations read from the audit history", () => {
  const now = new Date("2026-10-11T12:00:00.000Z");

  it("ignores every other event", () => {
    expect(
      issuedInvitations(
        [
          {
            ...created("a", "2026-10-11T10:00:00Z", null),
            eventType: "OBLIGATION_CREATED",
          },
          {
            ...created("b", "2026-10-11T10:00:00Z", null),
            subjectType: "OBLIGATION",
          },
        ],
        now,
      ),
    ).toEqual([]);
  });

  it("does not claim to know the state of an unexpired invitation", () => {
    const [latest] = issuedInvitations(
      [created("a", "2026-10-11T10:00:00Z", "2026-10-12T10:00:00.000Z")],
      now,
    );
    expect(latest?.standing).toBe("STATE_NOT_READABLE");
    expect(standingLabel.STATE_NOT_READABLE).toBe("Issued");
    expect(standingLabel.STATE_NOT_READABLE).not.toMatch(/active|open|sent/iu);
    expect(standingDetail.STATE_NOT_READABLE).toMatch(/not shown here/u);
  });

  it("marks an invitation past its expiry", () => {
    const [latest] = issuedInvitations(
      [created("a", "2026-10-10T10:00:00Z", "2026-10-11T10:00:00.000Z")],
      now,
    );
    expect(latest?.standing).toBe("PAST_EXPIRY");
  });

  it("orders newest first and closes everything before the newest", () => {
    const rows = issuedInvitations(
      [
        created("old", "2026-10-11T08:00:00Z", "2026-10-12T08:00:00.000Z"),
        created("new", "2026-10-11T11:00:00Z", "2026-10-12T11:00:00.000Z"),
        created("mid", "2026-10-11T09:00:00Z", "2026-10-12T09:00:00.000Z"),
      ],
      now,
    );
    expect(rows.map((row) => [row.id, row.standing])).toEqual([
      ["new", "STATE_NOT_READABLE"],
      ["mid", "CLOSED"],
      ["old", "CLOSED"],
    ]);
  });

  it("survives a payload without a usable expiry", () => {
    const [row] = issuedInvitations(
      [created("a", "2026-10-11T10:00:00Z", "not a date")],
      now,
    );
    expect(row).toMatchObject({
      expiresAt: null,
      standing: "STATE_NOT_READABLE",
    });
    expect(
      issuedInvitations(
        [{ ...created("a", "2026-10-11T10:00:00Z", null), payloadJson: null }],
        now,
      )[0]?.expiresAt,
    ).toBeNull();
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
