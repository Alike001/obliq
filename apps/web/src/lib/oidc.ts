import "server-only";

import * as oidc from "openid-client";

let cached: Promise<oidc.Configuration> | undefined;

export function oidcSettings() {
  const issuer = process.env.OIDC_ISSUER;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  const baseUrl = process.env.OBLIQ_APP_BASE_URL;
  if (!issuer || !clientId || !clientSecret || !baseUrl)
    throw new Error("OIDC deployment configuration is incomplete");
  return {
    issuer: new URL(issuer),
    clientId,
    clientSecret,
    redirectUri: new URL("/auth/callback", baseUrl).href,
  };
}

export function getOidcConfiguration() {
  const settings = oidcSettings();
  cached ??= oidc.discovery(
    settings.issuer,
    settings.clientId,
    settings.clientSecret,
  );
  return cached;
}

export { oidc };
