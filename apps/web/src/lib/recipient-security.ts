import "server-only";

import { hashRecipientSecret } from "@obliq/security";

export function recipientTokenPepper() {
  const value = process.env.OBLIQ_RECIPIENT_TOKEN_PEPPER;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV !== "production")
    return "obliq-recipient-development-pepper-only";
  throw new Error("OBLIQ_RECIPIENT_TOKEN_PEPPER is required in production");
}

export const recipientSecretHash = (
  domain: Parameters<typeof hashRecipientSecret>[0],
  secret: string,
  binding = "",
) => hashRecipientSecret(domain, secret, recipientTokenPepper(), binding);

export function recipientSessionCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Host-obliq_recipient"
    : "obliq_recipient";
}
