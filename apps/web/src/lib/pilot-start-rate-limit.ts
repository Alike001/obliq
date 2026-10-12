import type { RateLimitExceededError } from "@obliq/database";

export const pilotStartRateLimits = {
  client: { scope: "pilot:start", limit: 5, windowSeconds: 3600 },
  global: {
    scope: "pilot:start:global",
    subject: "public-pilot",
    limit: 100,
    windowSeconds: 3600,
  },
} as const;

type ConsumeRateLimit = (
  scope: string,
  subject: string,
  limit: number,
  windowSeconds: number,
) => Promise<unknown>;

export async function enforcePilotStartRateLimits(
  subject: string,
  consume: ConsumeRateLimit,
) {
  const client = pilotStartRateLimits.client;
  await consume(client.scope, subject, client.limit, client.windowSeconds);
  const global = pilotStartRateLimits.global;
  await consume(
    global.scope,
    global.subject,
    global.limit,
    global.windowSeconds,
  );
}

export function safePilotRateLimitDetails(error: RateLimitExceededError) {
  const scope =
    error.scope === pilotStartRateLimits.global.scope ? "capacity" : "client";
  const seconds = Math.max(1, error.retryAfterSeconds);
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return {
    scope,
    seconds,
    message:
      scope === "capacity"
        ? `The public pilot is at its workspace creation limit. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`
        : `Too many workspace creation attempts came from this connection. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
  } as const;
}

export function pilotRateLimitResponse(error: RateLimitExceededError) {
  const details = safePilotRateLimitDetails(error);
  return new Response(details.message, {
    status: 429,
    headers: {
      "Cache-Control": "no-store",
      "Retry-After": String(details.seconds),
      "X-Obliq-Rate-Limit-Scope": details.scope,
    },
  });
}
