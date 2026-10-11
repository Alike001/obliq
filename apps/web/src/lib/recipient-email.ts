import "server-only";

export type RecipientEmailMessage =
  | { kind: "INVITATION"; to: string; invitationUrl: string }
  | { kind: "VERIFICATION_CODE"; to: string; code: string };

export type RecipientEmailDelivery = { providerReference: string };

export class RecipientEmailDeliveryError extends Error {
  constructor(readonly code: "CONFIGURATION" | "UNAVAILABLE" | "REJECTED") {
    super("Recipient email delivery is unavailable");
    this.name = "RecipientEmailDeliveryError";
  }
}

const providerReferencePattern =
  /^(?:[a-z][a-z0-9_-]{0,15}:)?[0-9a-f-]{16,64}$/u;

function endpointUrl(value: string | undefined) {
  if (!value) throw new RecipientEmailDeliveryError("CONFIGURATION");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new RecipientEmailDeliveryError("CONFIGURATION");
  }
  const loopback =
    url.hostname === "127.0.0.1" ||
    url.hostname === "localhost" ||
    url.hostname === "[::1]";
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))
    throw new RecipientEmailDeliveryError("CONFIGURATION");
  if (
    process.env.OBLIQ_DEPLOYMENT_MODE === "production" &&
    url.protocol !== "https:"
  )
    throw new RecipientEmailDeliveryError("CONFIGURATION");
  return url;
}

function deliveryResponse(value: unknown): RecipientEmailDelivery | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).some(
      (key) => key !== "accepted" && key !== "providerReference",
    ) ||
    record.accepted !== true ||
    typeof record.providerReference !== "string" ||
    !providerReferencePattern.test(record.providerReference)
  )
    return null;
  return { providerReference: record.providerReference };
}

export async function sendRecipientEmail(
  message: RecipientEmailMessage,
  timeoutMs = 8_000,
): Promise<RecipientEmailDelivery> {
  const url = endpointUrl(process.env.OBLIQ_RECIPIENT_EMAIL_ENDPOINT);
  const token = process.env.OBLIQ_RECIPIENT_EMAIL_TOKEN;
  if (!token || token.length < 20)
    throw new RecipientEmailDeliveryError("CONFIGURATION");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1, timeoutMs));
  timeout.unref();
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) throw new RecipientEmailDeliveryError("REJECTED");
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new RecipientEmailDeliveryError("UNAVAILABLE");
    }
    const delivery = deliveryResponse(body);
    if (!delivery) throw new RecipientEmailDeliveryError("UNAVAILABLE");
    return delivery;
  } catch (error) {
    if (error instanceof RecipientEmailDeliveryError) throw error;
    throw new RecipientEmailDeliveryError("UNAVAILABLE");
  } finally {
    clearTimeout(timeout);
  }
}
