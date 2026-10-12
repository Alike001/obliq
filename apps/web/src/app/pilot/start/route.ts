import {
  createDefaultPolicy,
  createPilotWorkspace,
  finalizePilotWorkspace,
  RateLimitExceededError,
} from "@obliq/database";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { setPilotSessionCookie } from "@/lib/pilot-session";
import {
  rateLimitRequest,
  requestSubject,
  requireSameOrigin,
  securityPepper,
} from "@/lib/request-security";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";

export async function POST(request: Request) {
  if (getRuntimeSecurityConfig().deploymentMode !== "pilot")
    return new Response("Not found", { status: 404 });
  try {
    requireSameOrigin(request);
    // The global bucket bounds workspace creation even if an upstream proxy
    // accepts a caller-controlled forwarding header. The per-subject bucket
    // remains the tighter normal limit.
    await rateLimitRequest("pilot:start:global", "public-pilot", 100, 3600);
    await rateLimitRequest("pilot:start", await requestSubject(), 5, 3600);
    const created = await createPilotWorkspace(getDatabase(), {
      pepper: securityPepper(),
    });
    await createDefaultPolicy(getDatabase(), {
      organizationId: created.organization.id,
      userId: created.user.id,
    });
    await finalizePilotWorkspace(getDatabase(), created.workspace.id);
    const response = NextResponse.redirect(new URL("/app", request.url), 303);
    setPilotSessionCookie(response, created.token, created.expiresAt);
    return response;
  } catch (error) {
    if (error instanceof RateLimitExceededError)
      return new Response("Pilot workspace rate limit reached. Try later.", {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(error.retryAfterSeconds),
        },
      });
    return new Response("Pilot workspace could not be created.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
