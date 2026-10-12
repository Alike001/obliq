import { revokeDatabaseSession } from "@obliq/database";
import { NextResponse } from "next/server";
import { applicationUrl } from "@/lib/application-url";
import { getDatabase } from "@/lib/db";
import { requestSessionToken } from "@/lib/pilot-session";
import { requireSameOrigin, securityPepper } from "@/lib/request-security";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";
import { sessionCookieName } from "@/lib/session";

export async function POST(request: Request) {
  if (getRuntimeSecurityConfig().deploymentMode !== "pilot")
    return new Response("Not found", { status: 404 });
  try {
    requireSameOrigin(request);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
  const token = requestSessionToken(request);
  if (token)
    await revokeDatabaseSession(getDatabase(), token, securityPepper());
  const response = NextResponse.redirect(applicationUrl("/pilot"), 303);
  response.cookies.delete(sessionCookieName());
  return response;
}
