export type OrganizationId = string & { readonly __brand: "OrganizationId" };
export type UserId = string & { readonly __brand: "UserId" };

export interface TenantContext {
  readonly organizationId: OrganizationId;
  readonly userId: UserId;
  readonly role:
    | "OWNER"
    | "FINANCE"
    | "APPROVER"
    | "SIGNER"
    | "ACCOUNTANT"
    | "TREASURY"
    | "CFO"
    | "POLICY_ADMIN";
}

export function requireSameOrganization(
  context: TenantContext,
  resourceOrganizationId: OrganizationId,
): void {
  if (context.organizationId !== resourceOrganizationId) {
    throw new Error("Cross-organization access denied");
  }
}
