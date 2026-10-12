import "server-only";

import type { NextResponse } from "next/server";
import { cookieValue } from "./cookie-value";
import { sessionCookieName } from "./session";

export function setPilotSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set(sessionCookieName(), token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export function requestSessionToken(request: Request) {
  return cookieValue(request.headers.get("cookie"), sessionCookieName());
}
