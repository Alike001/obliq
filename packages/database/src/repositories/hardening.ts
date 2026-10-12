import { operationalFingerprint } from "@obliq/security";
import { and, eq, gt, isNull, lte, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { createDatabase } from "../index";
import {
  authChallenges,
  authIdentities,
  authSessions,
  evidenceAccessEvents,
  evidencePackages,
  memberships,
  organizations,
  pilotWorkspaces,
  rateLimitBuckets,
  users,
} from "../schema";

type Database = ReturnType<typeof createDatabase>["db"];

export class RateLimitExceededError extends Error {
  constructor(
    readonly retryAfterSeconds: number,
    readonly scope: string,
  ) {
    super("Request rate limit exceeded");
  }
}

function safeReturnTo(value: string | undefined) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(value)
  )
    return "/app";
  return value;
}

export async function createAuthChallenge(
  db: Database,
  input: {
    state: string;
    codeVerifier: string;
    nonce: string;
    returnTo?: string;
    pepper: string;
  },
) {
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  const [challenge] = await db
    .insert(authChallenges)
    .values({
      stateHash: operationalFingerprint(input.state, input.pepper),
      codeVerifier: input.codeVerifier,
      nonce: input.nonce,
      returnTo: safeReturnTo(input.returnTo),
      expiresAt,
    })
    .returning();
  if (!challenge) throw new Error("Authentication challenge was not persisted");
  return challenge;
}

export async function consumeAuthChallenge(
  db: Database,
  state: string,
  pepper: string,
) {
  return db.transaction(async (tx) => {
    const [challenge] = await tx
      .update(authChallenges)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(authChallenges.stateHash, operationalFingerprint(state, pepper)),
          isNull(authChallenges.consumedAt),
          gt(authChallenges.expiresAt, new Date()),
        ),
      )
      .returning();
    return challenge ?? null;
  });
}

export async function resolveProvisionedOidcIdentity(
  db: Database,
  issuer: string,
  subject: string,
) {
  const rows = await db
    .select({ identity: authIdentities, membership: memberships })
    .from(authIdentities)
    .innerJoin(
      memberships,
      and(
        eq(memberships.userId, authIdentities.userId),
        eq(memberships.status, "ACTIVE"),
      ),
    )
    .where(
      and(
        eq(authIdentities.issuer, issuer),
        eq(authIdentities.subject, subject),
      ),
    );
  if (rows.length !== 1)
    throw new Error(
      "OIDC identity must map to exactly one active organization membership",
    );
  return rows[0]!;
}

export async function createDatabaseSession(
  db: Database,
  input: { userId: string; organizationId: string; pepper: string },
) {
  const [membership] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, input.userId),
        eq(memberships.organizationId, input.organizationId),
        eq(memberships.status, "ACTIVE"),
      ),
    )
    .limit(1);
  if (!membership)
    throw new Error("Session identity lacks an active organization membership");
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 8 * 60 * 60_000);
  const [session] = await db
    .insert(authSessions)
    .values({
      tokenHash: operationalFingerprint(token, input.pepper),
      userId: input.userId,
      organizationId: input.organizationId,
      expiresAt,
    })
    .returning();
  if (!session) throw new Error("Authentication session was not persisted");
  return { token, expiresAt, session };
}

export const pilotLimits = {
  vendors: 20,
  obligations: 50,
  mutations: 200,
} as const;

async function insertPilotWorkspace(
  tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
  pepper: string,
  lifetimeMinutes: number,
) {
  const expiresAt = new Date(Date.now() + lifetimeMinutes * 60_000);
  const [organization] = await tx
    .insert(organizations)
    .values({ name: "Obliq fictional pilot workspace" })
    .returning();
  if (!organization) throw new Error("Pilot organization was not persisted");
  const [user] = await tx
    .insert(users)
    .values({
      email: `pilot-${organization.id}@invalid.obliq.local`,
      displayName: "Pilot finance operator",
    })
    .returning();
  if (!user) throw new Error("Pilot user was not persisted");
  await tx.insert(memberships).values({
    organizationId: organization.id,
    userId: user.id,
    // Temporarily OWNER so the standard policy repository can seed the one
    // supported pilot policy before the session is returned to the browser.
    role: "OWNER",
  });
  const [workspace] = await tx
    .insert(pilotWorkspaces)
    .values({
      organizationId: organization.id,
      userId: user.id,
      expiresAt,
    })
    .returning();
  if (!workspace) throw new Error("Pilot workspace was not persisted");
  const token = randomBytes(32).toString("base64url");
  const [session] = await tx
    .insert(authSessions)
    .values({
      tokenHash: operationalFingerprint(token, pepper),
      userId: user.id,
      organizationId: organization.id,
      expiresAt,
    })
    .returning();
  if (!session) throw new Error("Pilot session was not persisted");
  return { token, expiresAt, workspace, organization, user };
}

export async function finalizePilotWorkspace(
  db: Database,
  workspaceId: string,
) {
  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .select()
      .from(pilotWorkspaces)
      .where(
        and(
          eq(pilotWorkspaces.id, workspaceId),
          eq(pilotWorkspaces.state, "ACTIVE"),
          gt(pilotWorkspaces.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!workspace) throw new Error("Pilot workspace cannot be activated");
    await tx
      .update(memberships)
      .set({ role: "FINANCE" })
      .where(
        and(
          eq(memberships.organizationId, workspace.organizationId),
          eq(memberships.userId, workspace.userId),
          eq(memberships.status, "ACTIVE"),
        ),
      );
    return workspace;
  });
}

export async function createPilotWorkspace(
  db: Database,
  input: { pepper: string; lifetimeMinutes?: number },
) {
  const lifetimeMinutes = input.lifetimeMinutes ?? 120;
  if (
    !Number.isSafeInteger(lifetimeMinutes) ||
    lifetimeMinutes < 15 ||
    lifetimeMinutes > 240
  )
    throw new Error("Pilot workspace lifetime is outside the allowed range");
  return db.transaction(async (tx) => {
    await tx
      .update(pilotWorkspaces)
      .set({ state: "EXPIRED" })
      .where(
        and(
          eq(pilotWorkspaces.state, "ACTIVE"),
          lte(pilotWorkspaces.expiresAt, new Date()),
        ),
      );
    return insertPilotWorkspace(tx, input.pepper, lifetimeMinutes);
  });
}

export async function resetPilotWorkspace(
  db: Database,
  input: {
    organizationId: string;
    userId: string;
    token: string;
    pepper: string;
    lifetimeMinutes?: number;
  },
) {
  const lifetimeMinutes = input.lifetimeMinutes ?? 120;
  if (
    !Number.isSafeInteger(lifetimeMinutes) ||
    lifetimeMinutes < 15 ||
    lifetimeMinutes > 240
  )
    throw new Error("Pilot workspace lifetime is outside the allowed range");
  return db.transaction(async (tx) => {
    const [retired] = await tx
      .update(pilotWorkspaces)
      .set({ state: "RESET", resetAt: new Date() })
      .where(
        and(
          eq(pilotWorkspaces.organizationId, input.organizationId),
          eq(pilotWorkspaces.userId, input.userId),
          eq(pilotWorkspaces.state, "ACTIVE"),
          gt(pilotWorkspaces.expiresAt, new Date()),
        ),
      )
      .returning({ id: pilotWorkspaces.id });
    if (!retired) throw new Error("Active pilot workspace was not found");
    await tx
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(
            authSessions.tokenHash,
            operationalFingerprint(input.token, input.pepper),
          ),
          eq(authSessions.organizationId, input.organizationId),
          isNull(authSessions.revokedAt),
        ),
      );
    return insertPilotWorkspace(tx, input.pepper, lifetimeMinutes);
  });
}

export async function requireActivePilotWorkspace(
  db: Database,
  input: { organizationId: string; userId: string },
) {
  const [workspace] = await db
    .select()
    .from(pilotWorkspaces)
    .where(
      and(
        eq(pilotWorkspaces.organizationId, input.organizationId),
        eq(pilotWorkspaces.userId, input.userId),
        eq(pilotWorkspaces.state, "ACTIVE"),
        gt(pilotWorkspaces.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!workspace) throw new Error("Pilot workspace is expired or unavailable");
  return workspace;
}

export type PilotQuotaKind = "vendor" | "obligation" | "mutation";

/** Atomic counters bound concurrent pilot writes without touching other tenants. */
export async function consumePilotQuota(
  db: Database,
  input: { organizationId: string; userId: string; kind: PilotQuotaKind },
) {
  const vendorIncrement = input.kind === "vendor" ? 1 : 0;
  const obligationIncrement = input.kind === "obligation" ? 1 : 0;
  const [workspace] = await db
    .update(pilotWorkspaces)
    .set({
      mutationCount: sql`${pilotWorkspaces.mutationCount} + 1`,
      vendorCount: sql`${pilotWorkspaces.vendorCount} + ${vendorIncrement}`,
      obligationCount: sql`${pilotWorkspaces.obligationCount} + ${obligationIncrement}`,
    })
    .where(
      and(
        eq(pilotWorkspaces.organizationId, input.organizationId),
        eq(pilotWorkspaces.userId, input.userId),
        eq(pilotWorkspaces.state, "ACTIVE"),
        gt(pilotWorkspaces.expiresAt, new Date()),
        sql`${pilotWorkspaces.mutationCount} < ${pilotLimits.mutations}`,
        sql`${pilotWorkspaces.vendorCount} + ${vendorIncrement} <= ${pilotLimits.vendors}`,
        sql`${pilotWorkspaces.obligationCount} + ${obligationIncrement} <= ${pilotLimits.obligations}`,
      ),
    )
    .returning();
  if (!workspace)
    throw new Error("Pilot workspace quota or lifetime has been exceeded");
  return workspace;
}

export async function resolveDatabaseSession(
  db: Database,
  token: string,
  pepper: string,
) {
  const rows = await db
    .select({ session: authSessions, membership: memberships })
    .from(authSessions)
    .innerJoin(
      memberships,
      and(
        eq(memberships.userId, authSessions.userId),
        eq(memberships.organizationId, authSessions.organizationId),
        eq(memberships.status, "ACTIVE"),
      ),
    )
    .where(
      and(
        eq(authSessions.tokenHash, operationalFingerprint(token, pepper)),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function revokeDatabaseSession(
  db: Database,
  token: string,
  pepper: string,
) {
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(authSessions.tokenHash, operationalFingerprint(token, pepper)),
        isNull(authSessions.revokedAt),
      ),
    );
}

export async function enforceDatabaseRateLimit(
  db: Database,
  input: {
    scope: string;
    subject: string;
    limit: number;
    windowSeconds: number;
    pepper: string;
  },
) {
  if (!/^[a-z0-9:_-]{3,80}$/u.test(input.scope))
    throw new Error("Invalid rate-limit scope");
  if (!Number.isSafeInteger(input.limit) || input.limit < 1)
    throw new Error("Invalid rate-limit count");
  if (!Number.isSafeInteger(input.windowSeconds) || input.windowSeconds < 1)
    throw new Error("Invalid rate-limit window");
  const now = Date.now();
  const windowMs = input.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
  const subjectHash = operationalFingerprint(input.subject, input.pepper);
  const [bucket] = await db
    .insert(rateLimitBuckets)
    .values({ scope: input.scope, subjectHash, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [
        rateLimitBuckets.scope,
        rateLimitBuckets.subjectHash,
        rateLimitBuckets.windowStart,
      ],
      set: { count: sql`${rateLimitBuckets.count} + 1` },
    })
    .returning({ count: rateLimitBuckets.count });
  if (!bucket) throw new Error("Rate-limit persistence failed");
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStart.getTime() + windowMs - now) / 1000),
  );
  if (bucket.count > input.limit)
    throw new RateLimitExceededError(retryAfterSeconds, input.scope);
  return { remaining: input.limit - bucket.count, retryAfterSeconds };
}

export async function recordEvidenceAccess(
  db: Database,
  input: {
    organizationId: string;
    evidencePackageId: string;
    action: "VERIFY" | "DOWNLOAD";
    subjectFingerprint: string;
    outcome: "ACTIVE" | "REVOKED" | "SUPERSEDED" | "INTEGRITY_FAILURE";
  },
) {
  const [owned] = await db
    .select({ id: evidencePackages.id })
    .from(evidencePackages)
    .where(
      and(
        eq(evidencePackages.id, input.evidencePackageId),
        eq(evidencePackages.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!owned) throw new Error("Evidence package is outside organization scope");
  await db.insert(evidenceAccessEvents).values(input);
}
