import {
  consumeAuthChallenge,
  createDatabaseSession,
  RateLimitExceededError,
  resolveProvisionedOidcIdentity,
  revokeDatabaseSession,
} from "@obliq/database";
import { writeOperationalLog } from "@obliq/security";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { getOidcConfiguration, oidc, oidcSettings } from "@/lib/oidc";
import {
  rateLimitRequest,
  requestSubject,
  securityPepper,
} from "@/lib/request-security";
import { sessionCookieName } from "@/lib/session";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (getRuntimeSecurityConfig().authMode !== "oidc")
    return new Response("OIDC authentication is not configured", {
      status: 404,
    });
  try {
    await rateLimitRequest("auth:callback", await requestSubject(), 30, 300);
  } catch (error) {
    if (error instanceof RateLimitExceededError)
      return new Response("Too many authentication attempts", {
        status: 429,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      });
    throw error;
  }
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieState = cookieHeader
    .split(";")
    .map((item) => item.trim().split("="))
    .find(([name]) => name === "obliq_oidc_state")?.[1];
  if (!state || !cookieState || decodeURIComponent(cookieState) !== state)
    return new Response("Authentication state validation failed", {
      status: 400,
    });
  const pepper = securityPepper();
  const challenge = await consumeAuthChallenge(getDatabase(), state, pepper);
  if (!challenge)
    return new Response(
      "Authentication challenge expired or was already used",
      {
        status: 400,
      },
    );
  try {
    const tokens = await oidc.authorizationCodeGrant(
      await getOidcConfiguration(),
      url,
      {
        pkceCodeVerifier: challenge.codeVerifier,
        expectedState: state,
        expectedNonce: challenge.nonce,
      },
    );
    const claims = tokens.claims();
    if (!claims?.sub || !claims.iss)
      throw new Error("OIDC response did not contain a validated identity");
    const identity = await resolveProvisionedOidcIdentity(
      getDatabase(),
      claims.iss,
      claims.sub,
    );
    const currentToken = request.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)(?:__Host-)?obliq_session=([^;]+)/u)?.[1];
    if (currentToken)
      await revokeDatabaseSession(
        getDatabase(),
        decodeURIComponent(currentToken),
        pepper,
      );
    const created = await createDatabaseSession(getDatabase(), {
      userId: identity.identity.userId,
      organizationId: identity.membership.organizationId,
      pepper,
    });
    const response = NextResponse.redirect(
      new URL(challenge.returnTo, oidcSettings().redirectUri),
      303,
    );
    response.cookies.set("obliq_oidc_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/auth/callback",
      maxAge: 0,
    });
    response.cookies.set(sessionCookieName(), created.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: created.expiresAt,
    });
    writeOperationalLog("info", "auth.login.succeeded", {
      userId: identity.identity.userId,
      organizationId: identity.membership.organizationId,
    });
    return response;
  } catch (error) {
    writeOperationalLog("warn", "auth.login.failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return new Response("Authentication failed", { status: 401 });
  }
}
