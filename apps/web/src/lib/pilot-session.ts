import "server-only";

import type { NextResponse } from "next/server";
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
  const name = sessionCookieName();
  const encoded = request.headers
    .get("cookie")
    ?.match(
      new RegExp("(?:^|;\\s*)" + name.replace("-", "\\-") + "=([^;]+)", "u"),
    )?.[1];
  return encoded ? decodeURIComponent(encoded) : null;
}
