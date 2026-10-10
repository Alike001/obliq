import "server-only";

type EmailMessage =
  | { kind: "INVITATION"; to: string; invitationUrl: string }
  | { kind: "VERIFICATION_CODE"; to: string; code: string };

export async function sendRecipientEmail(message: EmailMessage) {
  const endpoint = process.env.OBLIQ_RECIPIENT_EMAIL_ENDPOINT;
  const token = process.env.OBLIQ_RECIPIENT_EMAIL_TOKEN;
  if (!endpoint || !token)
    throw new Error("Recipient email delivery is unavailable");
  const url = new URL(endpoint);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    throw new Error("Recipient email delivery requires HTTPS");
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Recipient email delivery failed");
}
