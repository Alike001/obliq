import "server-only";

import type { OrganizationId, TenantContext, UserId } from "@obliq/domain";
import {
  requireActiveMembership,
  resolveDatabaseSession,
} from "@obliq/database";
import { cookies } from "next/headers";
import { getDatabase } from "./db";
import { securityPepper } from "./request-security";
import { getRuntimeSecurityConfig } from "./runtime-config";

/**
 * Development identity is explicit and unavailable in production. OIDC mode
 * resolves an opaque, hashed database session and rechecks active membership.
 */
export async function getTenantContext(): Promise<TenantContext> {
  const runtime = getRuntimeSecurityConfig();
  if (runtime.authMode === "disabled") throw new AuthenticationRequiredError();
  if (runtime.authMode === "oidc") {
    const token = (await cookies()).get(sessionCookieName())?.value;
    if (!token) throw new AuthenticationRequiredError();
    const result = await resolveDatabaseSession(
      getDatabase(),
      token,
      securityPepper(),
    );
    if (!result) throw new AuthenticationRequiredError();
    return {
      userId: result.session.userId as UserId,
      organizationId: result.session.organizationId as OrganizationId,
      role: result.membership.role,
    };
  }
  const userId = process.env.OBLIQ_DEV_USER_ID;
  const organizationId = process.env.OBLIQ_DEV_ORGANIZATION_ID;
  if (!userId || !organizationId)
    throw new Error("Development tenant is not configured");
  const context = {
    userId: userId as UserId,
    organizationId: organizationId as OrganizationId,
  };
  const membership = await requireActiveMembership(getDatabase(), context);
  return { ...context, role: membership.role };
}

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthenticationRequiredError";
  }
}

export function sessionCookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Host-obliq_session"
    : "obliq_session";
}
