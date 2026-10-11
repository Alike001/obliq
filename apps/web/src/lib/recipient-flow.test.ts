import { describe, expect, it } from "vitest";
import {
  abbreviateReceiver,
  challengeOutcome,
  destinationOutcome,
  groupReceiver,
  isCompleteCode,
  minutesRemaining,
  normalizeCode,
  parseConfirmation,
  parseSessionSummary,
  readInvitationToken,
  readStoredAttempt,
  receiverProblem,
  receiverProblemMessage,
  summaryOutcome,
  verificationOutcome,
} from "./recipient-flow";

const token = "A".repeat(43);
const body = "qpzry9x8gf2tvdw0s3jn54khce6mua7l".repeat(4);
const regtestAddress = `uregtest1${body}`;

const summaryBody = {
  invitationId: "0b6f0f4e-3f0e-4b1a-9c55-0d0f6a1f2a10",
  obligation: {
    id: "5a1f6c1e-90a4-4f0b-8b6c-2f7d7c0f8f11",
    reference: "INV-2041",
    amountMinor: "125000",
    currency: "USD",
    dueAt: "2026-11-01T00:00:00.000Z",
  },
  network: "regtest",
  contactVerification: "CONTACT_VERIFIED",
  addressOwnershipProof: "UNAVAILABLE",
  expiresAt: "2026-10-11T12:30:00.000Z",
};

const confirmationBody = {
  status: "RECIPIENT_CONFIRMED",
  destinationId: "9d0b7f55-2b1c-4b89-8f3e-3f0f5f3c7a12",
  destinationVersion: 2,
  verificationStatus: "UNVERIFIED",
  addressOwnershipProof: "UNAVAILABLE",
  recovered: false,
};

const reply = (status: number, value: unknown = null) =>
  ({ kind: "response", status, body: value }) as const;
const unreachable = { kind: "unreachable" } as const;

describe("invitation token", () => {
  it("is read from the fragment only", () => {
    expect(readInvitationToken(`#token=${token}`)).toBe(token);
    expect(readInvitationToken(`token=${token}`)).toBe(token);
    expect(readInvitationToken("")).toBeNull();
    expect(readInvitationToken("#")).toBeNull();
    expect(readInvitationToken("#other=1")).toBeNull();
  });

  it("rejects a token of the wrong shape instead of sending it", () => {
    expect(readInvitationToken("#token=short")).toBeNull();
    expect(readInvitationToken(`#token=${"A".repeat(129)}`)).toBeNull();
    expect(readInvitationToken(`#token=${"A".repeat(42)}%20`)).toBeNull();
    expect(readInvitationToken(`#token=${"A".repeat(42)}/`)).toBeNull();
  });
});

describe("verification code", () => {
  it("keeps six digits from whatever was pasted", () => {
    expect(normalizeCode(" 123 456 ")).toBe("123456");
    expect(normalizeCode("12-34-56-78")).toBe("123456");
    expect(isCompleteCode("123456")).toBe(true);
    expect(isCompleteCode("12345")).toBe(false);
  });
});

describe("address first look", () => {
  it("passes a well-formed Unified Address for the session's network", () => {
    expect(receiverProblem(regtestAddress, "regtest")).toBeNull();
    expect(receiverProblem(`  ${regtestAddress}\n`, "regtest")).toBeNull();
    expect(receiverProblem(`u1${body}`, "mainnet")).toBeNull();
    expect(receiverProblem(`utest1${body}`, "testnet")).toBeNull();
  });

  it("names an address from another network", () => {
    expect(receiverProblem(`u1${body}`, "regtest")).toBe("WRONG_NETWORK");
    expect(receiverProblem(`utest1${body}`, "mainnet")).toBe("WRONG_NETWORK");
    expect(receiverProblem(regtestAddress, "testnet")).toBe("WRONG_NETWORK");
  });

  it("refuses transparent and Sapling addresses before they are sent", () => {
    expect(
      receiverProblem("t1Hsc1LR8yKnbbe3twRp88p6vFfC5t7DLbs", "mainnet"),
    ).toBe("TRANSPARENT");
    expect(
      receiverProblem("tmHMBeeYRuc2eVicLNfP15YLxbQsooCA6jb", "regtest"),
    ).toBe("TRANSPARENT");
    expect(receiverProblem(`zregtestsapling1${body}`, "regtest")).toBe(
      "SAPLING",
    );
    expect(receiverProblem(`zs1${body}`, "mainnet")).toBe("SAPLING");
  });

  it("catches empty, broken and malformed input", () => {
    expect(receiverProblem("   ", "regtest")).toBe("EMPTY");
    expect(
      receiverProblem(`${regtestAddress.slice(0, 40)} ${body}`, "regtest"),
    ).toBe("HAS_SPACES");
    expect(receiverProblem("uregtest1qpzry", "regtest")).toBe("TOO_SHORT");
    expect(receiverProblem(`uregtest1${body.repeat(5)}`, "regtest")).toBe(
      "TOO_LONG",
    );
    expect(receiverProblem(`uregtest1${body}B`, "regtest")).toBe("NOT_UNIFIED");
    expect(
      receiverProblem("0x52908400098527886E0F7030069857D2", "regtest"),
    ).toBe("NOT_UNIFIED");
  });

  it("explains every problem without claiming validation", () => {
    for (const problem of [
      "EMPTY",
      "TOO_SHORT",
      "TOO_LONG",
      "HAS_SPACES",
      "TRANSPARENT",
      "SAPLING",
      "WRONG_NETWORK",
      "NOT_UNIFIED",
    ] as const)
      expect(receiverProblemMessage(problem, "regtest")).not.toMatch(
        /verified|valid address|confirmed/iu,
      );
  });

  it("abbreviates and groups without altering characters", () => {
    expect(abbreviateReceiver(regtestAddress)).toBe(
      `${regtestAddress.slice(0, 12)}…${regtestAddress.slice(-12)}`,
    );
    expect(abbreviateReceiver("short")).toBe("short");
    expect(groupReceiver(regtestAddress).join("")).toBe(regtestAddress);
  });
});

describe("session summary", () => {
  it("reads the scoped obligation the server returned", () => {
    const summary = parseSessionSummary(summaryBody);
    expect(summary).toMatchObject({
      reference: "INV-2041",
      amount: "USD 1,250.00",
      network: "regtest",
    });
    expect(summary?.dueAt?.toISOString()).toBe("2026-11-01T00:00:00.000Z");
  });

  it("accepts an obligation with no due date", () => {
    expect(
      parseSessionSummary({
        ...summaryBody,
        obligation: { ...summaryBody.obligation, dueAt: null },
      })?.dueAt,
    ).toBeNull();
  });

  it("shows nothing when the reply is incomplete or claims more", () => {
    expect(parseSessionSummary(null)).toBeNull();
    expect(
      parseSessionSummary({ ...summaryBody, obligation: null }),
    ).toBeNull();
    expect(
      parseSessionSummary({ ...summaryBody, network: "dogecoin" }),
    ).toBeNull();
    expect(
      parseSessionSummary({
        ...summaryBody,
        obligation: { ...summaryBody.obligation, amountMinor: "12.50" },
      }),
    ).toBeNull();
    expect(
      parseSessionSummary({ ...summaryBody, addressOwnershipProof: "PROVEN" }),
    ).toBeNull();
    expect(
      parseSessionSummary({ ...summaryBody, expiresAt: "soon" }),
    ).toBeNull();
  });
});

describe("destination confirmation", () => {
  it("accepts only an unverified result with ownership unproved", () => {
    expect(parseConfirmation(confirmationBody)).toEqual({
      destinationVersion: 2,
      recovered: false,
    });
    expect(
      parseConfirmation({ ...confirmationBody, recovered: true })?.recovered,
    ).toBe(true);
  });

  it("refuses to describe a reply that claims verification", () => {
    expect(
      parseConfirmation({
        ...confirmationBody,
        verificationStatus: "VERIFIED_MANUALLY",
      }),
    ).toBeNull();
    expect(
      parseConfirmation({
        ...confirmationBody,
        addressOwnershipProof: "AVAILABLE",
      }),
    ).toBeNull();
    expect(parseConfirmation({ status: "RECIPIENT_CONFIRMED" })).toBeNull();
    expect(
      parseConfirmation({ error: "RECIPIENT_WORKFLOW_UNAVAILABLE" }),
    ).toBeNull();
  });
});

describe("reading server replies", () => {
  it("never reports a code as sent, only as sent if the link is valid", () => {
    expect(challengeOutcome(reply(202, { status: "IF_VALID_CODE_SENT" }))).toBe(
      "SENT_IF_VALID",
    );
    expect(challengeOutcome(reply(404))).toBe("UNREACHABLE");
    expect(challengeOutcome(reply(202, {}))).toBe("UNREACHABLE");
    expect(challengeOutcome(unreachable)).toBe("UNREACHABLE");
  });

  it("separates a refused code from an unanswered check", () => {
    expect(
      verificationOutcome(
        reply(200, {
          status: "CONTACT_VERIFIED",
          addressOwnershipProof: "UNAVAILABLE",
        }),
      ),
    ).toBe("VERIFIED");
    expect(
      verificationOutcome(
        reply(404, { error: "RECIPIENT_WORKFLOW_UNAVAILABLE" }),
      ),
    ).toBe("NOT_ACCEPTED");
    expect(verificationOutcome(reply(500))).toBe("UNCERTAIN");
    expect(verificationOutcome(reply(200, {}))).toBe("UNCERTAIN");
    expect(verificationOutcome(unreachable)).toBe("UNCERTAIN");
  });

  it("treats a missing session as no session, not as an error", () => {
    expect(summaryOutcome(reply(200, summaryBody)).kind).toBe("SUMMARY");
    expect(summaryOutcome(reply(404)).kind).toBe("NO_SESSION");
    expect(summaryOutcome(reply(500)).kind).toBe("UNCERTAIN");
    expect(summaryOutcome(reply(200, {})).kind).toBe("UNCERTAIN");
    expect(summaryOutcome(unreachable).kind).toBe("UNCERTAIN");
  });

  it("confirms a destination only on an explicit, well-formed success", () => {
    expect(destinationOutcome(reply(200, confirmationBody)).kind).toBe(
      "CONFIRMED",
    );
    expect(destinationOutcome(reply(404)).kind).toBe("CLOSED");
    expect(destinationOutcome(reply(409)).kind).toBe("CONFLICT");
    expect(
      destinationOutcome(reply(422, { error: "INVALID_SHIELDED_DESTINATION" }))
        .kind,
    ).toBe("INVALID");
    for (const uncertain of [
      reply(422, { error: "RECIPIENT_WORKFLOW_UNAVAILABLE" }),
      reply(503, { error: "RECIPIENT_WORKFLOW_UNAVAILABLE" }),
      reply(500),
      reply(200, {}),
      reply(200, { ...confirmationBody, verificationStatus: "VERIFIED" }),
      unreachable,
    ])
      expect(destinationOutcome(uncertain).kind).toBe("UNCERTAIN");
  });
});

describe("session clock", () => {
  it("rounds up and stops at zero", () => {
    const now = new Date("2026-10-11T12:00:00.000Z");
    expect(minutesRemaining(new Date("2026-10-11T12:30:00.000Z"), now)).toBe(
      30,
    );
    expect(minutesRemaining(new Date("2026-10-11T12:00:01.000Z"), now)).toBe(1);
    expect(minutesRemaining(now, now)).toBe(0);
    expect(minutesRemaining(new Date("2026-10-11T11:00:00.000Z"), now)).toBe(0);
  });
});

describe("stored retry key", () => {
  const stored = JSON.stringify({
    invitationId: summaryBody.invitationId,
    idempotencyKey: "3b0f6a52-6a4c-4f6e-9a6e-0c1d2e3f4a5b",
    receiver: regtestAddress,
    state: "PENDING",
  });

  it("is reused for the same invitation", () => {
    expect(readStoredAttempt(stored, summaryBody.invitationId)).toEqual({
      invitationId: summaryBody.invitationId,
      idempotencyKey: "3b0f6a52-6a4c-4f6e-9a6e-0c1d2e3f4a5b",
      receiver: regtestAddress,
      state: "PENDING",
    });
  });

  it("is ignored for another invitation or when malformed", () => {
    expect(readStoredAttempt(stored, "another-invitation")).toBeNull();
    expect(readStoredAttempt(null, summaryBody.invitationId)).toBeNull();
    expect(readStoredAttempt("{", summaryBody.invitationId)).toBeNull();
    expect(
      readStoredAttempt(
        JSON.stringify({
          invitationId: summaryBody.invitationId,
          idempotencyKey: "short",
        }),
        summaryBody.invitationId,
      ),
    ).toBeNull();
  });

  it("never holds the invitation token", () => {
    expect(stored).not.toContain("token");
  });

  it("rejects a pending retry without its exact original receiver", () => {
    expect(
      readStoredAttempt(
        JSON.stringify({
          invitationId: summaryBody.invitationId,
          idempotencyKey: "3b0f6a52-6a4c-4f6e-9a6e-0c1d2e3f4a5b",
          receiver: null,
          state: "PENDING",
        }),
        summaryBody.invitationId,
      ),
    ).toBeNull();
  });
});
