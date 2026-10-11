import { describe, expect, it } from "vitest";
import {
  recipientChallengeRequestSchema,
  recipientChallengeVerificationSchema,
  recipientDestinationConfirmationSchema,
  recipientInvitationRequestSchema,
  recipientInvitationTtlMs,
  recipientSessionTtlMs,
} from "./recipient";

describe("private payables recipient contracts", () => {
  it("keeps organization authority and assurance state out of recipient input", () => {
    expect(() =>
      recipientInvitationRequestSchema.parse({
        obligationId: "019c6ee4-b488-7a99-b082-b668c0d0fe57",
        organizationId: "019c6ee4-b488-7a99-b082-b668c0d0fe58",
      }),
    ).toThrow();
    expect(() =>
      recipientDestinationConfirmationSchema.parse({
        receiver: `uregtest1${"a".repeat(90)}`,
        idempotencyKey: "recipient-retry-key",
        verificationStatus: "VERIFIED_MANUALLY",
        approvalState: "APPROVED",
      }),
    ).toThrow();
  });

  it("accepts only bounded recipient secrets and fixed lifetimes", () => {
    expect(
      recipientChallengeRequestSchema.parse({
        invitationToken: "a".repeat(43),
      }),
    ).toEqual({ invitationToken: "a".repeat(43) });
    expect(
      recipientChallengeVerificationSchema.parse({
        invitationToken: "a".repeat(43),
        code: "123456",
      }),
    ).toEqual({ invitationToken: "a".repeat(43), code: "123456" });
    expect(() =>
      recipientChallengeVerificationSchema.parse({
        invitationToken: "a".repeat(43),
        code: "1234567",
      }),
    ).toThrow();
    expect(recipientInvitationTtlMs).toBe(24 * 60 * 60 * 1_000);
    expect(recipientSessionTtlMs).toBe(30 * 60 * 1_000);
  });
});
