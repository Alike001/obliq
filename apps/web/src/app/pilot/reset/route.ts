import {
  createDefaultPolicy,
  finalizePilotWorkspace,
  resetPilotWorkspace,
} from "@obliq/database";
import { writeOperationalLog } from "@obliq/security";
import { NextResponse } from "next/server";
import { applicationUrl } from "@/lib/application-url";
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
  let stage = "origin";
  try {
    requireSameOrigin(request);
    stage = "session-token";
    const token = requestSessionToken(request);
    if (!token) return new Response("Authentication required", { status: 401 });
    stage = "tenant";
    const actor = await getTenantContext();
    stage = "rate-limit";
    await rateLimitRequest(
      "pilot:reset",
      actor.organizationId + ":" + actor.userId,
      3,
      3600,
    );
    stage = "workspace";
    const created = await resetPilotWorkspace(getDatabase(), {
      organizationId: actor.organizationId,
      userId: actor.userId,
      token,
      pepper: securityPepper(),
    });
    stage = "policy";
    await createDefaultPolicy(getDatabase(), {
      organizationId: created.organization.id,
      userId: created.user.id,
    });
    stage = "finalize";
    await finalizePilotWorkspace(getDatabase(), created.workspace.id);
    stage = "redirect";
    const response = NextResponse.redirect(applicationUrl("/app"), 303);
    setPilotSessionCookie(response, created.token, created.expiresAt);
    return response;
  } catch {
    writeOperationalLog("error", "pilot_workspace_reset_failed", { stage });
    return new Response("Pilot workspace could not be reset safely.", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
