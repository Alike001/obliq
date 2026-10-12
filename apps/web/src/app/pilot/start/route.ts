import {
  createDefaultPolicy,
  createPilotWorkspace,
  finalizePilotWorkspace,
  RateLimitExceededError,
} from "@obliq/database";
import { writeOperationalLog } from "@obliq/security";
import { NextResponse } from "next/server";
import { applicationUrl } from "@/lib/application-url";
import { getDatabase } from "@/lib/db";
import { setPilotSessionCookie } from "@/lib/pilot-session";
import {
  enforcePilotStartRateLimits,
  pilotRateLimitResponse,
  safePilotRateLimitDetails,
} from "@/lib/pilot-start-rate-limit";
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
    await enforcePilotStartRateLimits(await requestSubject(), rateLimitRequest);
    const created = await createPilotWorkspace(getDatabase(), {
      pepper: securityPepper(),
    });
    await createDefaultPolicy(getDatabase(), {
      organizationId: created.organization.id,
      userId: created.user.id,
    });
    await finalizePilotWorkspace(getDatabase(), created.workspace.id);
    const response = NextResponse.redirect(applicationUrl("/app"), 303);
    setPilotSessionCookie(response, created.token, created.expiresAt);
    return response;
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      const details = safePilotRateLimitDetails(error);
      writeOperationalLog("warn", "pilot_workspace_rate_limited", {
        scope: details.scope,
        retryAfterSeconds: details.seconds,
      });
      return pilotRateLimitResponse(error);
    }
    return new Response("Pilot workspace could not be created.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
