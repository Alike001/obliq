import {
  createDefaultPolicy,
  finalizePilotWorkspace,
  resetPilotWorkspace,
} from "@obliq/database";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import {
  requestSessionToken,
  setPilotSessionCookie,
} from "@/lib/pilot-session";
import {
  rateLimitRequest,
  requireSameOrigin,
  securityPepper,
} from "@/lib/request-security";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";
import { getTenantContext } from "@/lib/session";

export async function POST(request: Request) {
  if (getRuntimeSecurityConfig().deploymentMode !== "pilot")
    return new Response("Not found", { status: 404 });
  try {
    requireSameOrigin(request);
    const token = requestSessionToken(request);
    if (!token) return new Response("Authentication required", { status: 401 });
    const actor = await getTenantContext();
    await rateLimitRequest(
      "pilot:reset",
      actor.organizationId + ":" + actor.userId,
      3,
      3600,
    );
    const created = await resetPilotWorkspace(getDatabase(), {
      organizationId: actor.organizationId,
      userId: actor.userId,
      token,
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
  } catch {
    return new Response("Pilot workspace could not be reset safely.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
