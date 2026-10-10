import { z } from "zod";

export const recipientInvitationRequestSchema = z.strictObject({
  obligationId: z.uuid(),
});

export const recipientChallengeRequestSchema = z.strictObject({
  invitationToken: z.string().min(43).max(128),
});

export const recipientChallengeVerificationSchema = z.strictObject({
  invitationToken: z.string().min(43).max(128),
  code: z.string().regex(/^\d{6}$/u),
});

export const recipientDestinationConfirmationSchema = z.strictObject({
  receiver: z.string().trim().min(20).max(512),
  idempotencyKey: z.string().min(16).max(128),
});

export const recipientInvitationRevocationSchema = z.strictObject({
  reasonCode: z.enum([
    "CONTACT_CHANGED",
    "SENT_IN_ERROR",
    "SECURITY_CONCERN",
    "OTHER",
  ]),
});

export type RecipientInvitationRevocationReason = z.infer<
  typeof recipientInvitationRevocationSchema
>["reasonCode"];

export const recipientInvitationPurpose =
  "CONFIRM_PAYMENT_DESTINATION" as const;
export const recipientInvitationTtlMs = 24 * 60 * 60 * 1_000;
export const recipientSessionTtlMs = 30 * 60 * 1_000;
export const recipientChallengeTtlMs = 10 * 60 * 1_000;

export type RecipientDestinationConfirmation = z.infer<
  typeof recipientDestinationConfirmationSchema
>;
