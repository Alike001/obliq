import "server-only";

import { enforceDatabaseRateLimit } from "@obliq/database";
import {
  isAllowedMutationOrigin,
  operationalFingerprint,
} from "@obliq/security";
import { headers } from "next/headers";
import { getDatabase } from "./db";

export function securityPepper() {
  const value = process.env.OBLIQ_SESSION_PEPPER;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV !== "production")
    return "obliq-development-only-pepper-not-for-production";
  throw new Error("OBLIQ_SESSION_PEPPER is required in production");
}

export async function requestSubject() {
  const incoming = await headers();
  const forwarded = incoming.get("x-forwarded-for")?.split(",")[0]?.trim();
  const remote = forwarded || incoming.get("x-real-ip") || "unknown";
  return operationalFingerprint(remote, securityPepper());
}

export async function rateLimitRequest(
  scope: string,
  subject: string,
  limit: number,
  windowSeconds: number,
) {
  return enforceDatabaseRateLimit(getDatabase(), {
    scope,
    subject,
    limit,
    windowSeconds,
    pepper: securityPepper(),
  });
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const configured = process.env.OBLIQ_APP_BASE_URL;
  const expected = configured
    ? new URL(configured).origin
    : new URL(request.url).origin;
  if (!isAllowedMutationOrigin(origin, expected))
    throw new Error("Cross-origin mutation rejected");
}
