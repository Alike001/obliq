import { revokeDatabaseSession } from "@obliq/database";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import {
  rateLimitRequest,
  requestSubject,
  requireSameOrigin,
  securityPepper,
} from "@/lib/request-security";
import { sessionCookieName } from "@/lib/session";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
  await rateLimitRequest("auth:logout", await requestSubject(), 20, 300);
  const name = sessionCookieName();
  const token = request.headers
    .get("cookie")
    ?.match(
      new RegExp(`(?:^|;\\s*)${name.replace("-", "\\-")}=([^;]+)`, "u"),
    )?.[1];
  if (token)
    await revokeDatabaseSession(
      getDatabase(),
      decodeURIComponent(token),
      securityPepper(),
    );
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete(name);
  return response;
}
