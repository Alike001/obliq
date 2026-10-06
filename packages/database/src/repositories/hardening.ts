import { operationalFingerprint } from "@obliq/security";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import type { createDatabase } from "../index";
import {
  authChallenges,
  authIdentities,
  authSessions,
  evidenceAccessEvents,
  evidencePackages,
  memberships,
  rateLimitBuckets,
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
