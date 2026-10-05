import "server-only";

import type { OrganizationId, TenantContext, UserId } from "@obliq/domain";

/**
 * Phase-0 development session boundary. This is server-only by convention and
 * must be replaced by authenticated, server-validated membership lookup before production.
 */
export function getDevelopmentTenant(): TenantContext {
  if (process.env.OBLIQ_SESSION_MODE !== "development") {
    throw new Error(
      "Development session is unavailable outside development mode",
    );
  }
  const userId = process.env.OBLIQ_DEV_USER_ID;
  const organizationId = process.env.OBLIQ_DEV_ORGANIZATION_ID;
  if (!userId || !organizationId)
    throw new Error("Development tenant is not configured");
  return {
    userId: userId as UserId,
    organizationId: organizationId as OrganizationId,
    role: "OWNER",
  };
}
