import { createAuthChallenge, RateLimitExceededError } from "@obliq/database";
import { writeOperationalLog } from "@obliq/security";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { getOidcConfiguration, oidc, oidcSettings } from "@/lib/oidc";
import {
  rateLimitRequest,
  requestSubject,
  securityPepper,
} from "@/lib/request-security";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (getRuntimeSecurityConfig().authMode !== "oidc")
    return new Response("OIDC authentication is not configured", {
      status: 404,
    });
  const subject = await requestSubject();
  try {
    await rateLimitRequest("auth:login", subject, 10, 300);
  } catch (error) {
    if (error instanceof RateLimitExceededError)
      return new Response("Too many authentication attempts", {
        status: 429,
        headers: { "Retry-After": String(error.retryAfterSeconds) },
      });
    throw error;
  }
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);
  const requestUrl = new URL(request.url);
  const returnTo = requestUrl.searchParams.get("returnTo") ?? undefined;
  const challenge = await createAuthChallenge(getDatabase(), {
    state,
    nonce,
    codeVerifier,
    ...(returnTo ? { returnTo } : {}),
    pepper: securityPepper(),
  });
  const settings = oidcSettings();
  const destination = oidc.buildAuthorizationUrl(await getOidcConfiguration(), {
    redirect_uri: settings.redirectUri,
    scope: "openid email profile",
    response_type: "code",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });
  const response = NextResponse.redirect(destination);
  response.cookies.set("obliq_oidc_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/callback",
    expires: challenge.expiresAt,
  });
  writeOperationalLog("info", "auth.login.started", { subject });
  return response;
}
