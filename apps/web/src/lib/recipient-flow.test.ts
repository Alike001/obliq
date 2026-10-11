import { describe, expect, it, vi } from "vitest";
import {
  classifyDestinationFailure,
  consumeInvitationToken,
  destinationAttemptFor,
  parseRecipientSession,
} from "./recipient-flow";

describe("recipient browser boundary", () => {
  it("removes the URL fragment before returning the in-memory token", () => {
    const replaceState = vi.fn();
    const token = "a".repeat(43);
    expect(
      consumeInvitationToken(
        {
          hash: `#token=${token}`,
          pathname: "/payables/invitation",
          search: "",
        },
        { replaceState },
      ),
    ).toBe(token);
    expect(replaceState).toHaveBeenCalledOnce();
    expect(replaceState).toHaveBeenCalledWith(null, "", "/payables/invitation");
    expect(JSON.stringify(replaceState.mock.calls)).not.toContain(token);
  });

  it("cleans malformed fragments and refuses short tokens", () => {
    const replaceState = vi.fn();
    expect(
      consumeInvitationToken(
        {
          hash: "#token=guessable",
          pathname: "/payables/invitation",
          search: "?source=email",
        },
        { replaceState },
      ),
    ).toBeNull();
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/payables/invitation?source=email",
    );
  });

  it("accepts only the deliberately scoped session contract", () => {
    const valid = {
      invitationId: "invite-id",
      obligation: {
        id: "obligation-id",
        reference: "INV-1042",
        amountMinor: "100000",
        currency: "USD",
        dueAt: null,
      },
      network: "testnet",
      contactVerification: "CONTACT_VERIFIED",
      addressOwnershipProof: "UNAVAILABLE",
      expiresAt: "2026-10-11T08:00:00.000Z",
    };
    expect(parseRecipientSession(valid)).toEqual(valid);
    expect(
      parseRecipientSession({
        ...valid,
        addressOwnershipProof: "VERIFIED",
      }),
    ).toBeNull();
    expect(
      parseRecipientSession({
        ...valid,
        obligation: { ...valid.obligation, amountMinor: "1000.00" },
      }),
    ).toBeNull();
  });

  it("keeps invalid input distinct from uncertain infrastructure failures", () => {
    expect(classifyDestinationFailure(422)).toBe("INVALID");
    expect(classifyDestinationFailure(409)).toBe("CONFLICT");
    expect(classifyDestinationFailure(404)).toBe("EXPIRED");
    expect(classifyDestinationFailure(503)).toBe("UNAVAILABLE");
  });

  it("reuses one idempotency key for uncertain retries and rotates on changed input", () => {
    const first = destinationAttemptFor(null, "  utest1first  ", () => "key-1");
    expect(destinationAttemptFor(first, "utest1first", () => "key-2")).toBe(
      first,
    );
    expect(
      destinationAttemptFor(first, "utest1changed", () => "key-2"),
    ).toEqual({ receiver: "utest1changed", key: "key-2" });
  });
});
