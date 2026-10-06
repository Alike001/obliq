import { operationalFingerprint } from "@obliq/security";
import { eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, schema } from "../index";
import {
  RateLimitExceededError,
  consumeAuthChallenge,
  createAuthChallenge,
  createDatabaseSession,
  enforceDatabaseRateLimit,
  resolveDatabaseSession,
  resolveProvisionedOidcIdentity,
  revokeDatabaseSession,
} from "./hardening";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("production identity and abuse-control repositories", () => {
  const connection = createDatabase(databaseUrl!);
  const organizationA = randomUUID();
  const organizationB = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();
  const pepper = "phase-six-integration-pepper-at-least-32-chars";

  beforeAll(async () => {
    await connection.db.insert(schema.organizations).values([
      { id: organizationA, name: "Hardening A" },
      { id: organizationB, name: "Hardening B" },
    ]);
    await connection.db.insert(schema.users).values([
      { id: userA, email: `${userA}@test.obliq` },
      { id: userB, email: `${userB}@test.obliq` },
    ]);
    await connection.db.insert(schema.memberships).values([
      { organizationId: organizationA, userId: userA, role: "OWNER" },
      { organizationId: organizationB, userId: userB, role: "OWNER" },
    ]);
    await connection.db.insert(schema.authIdentities).values({
      userId: userA,
      issuer: "https://identity.test",
      subject: "subject-a",
    });
  });

  afterAll(async () => {
    await connection.db
      .delete(schema.rateLimitBuckets)
      .where(eq(schema.rateLimitBuckets.scope, "test:hardening"));
    await connection.db
      .delete(schema.authSessions)
      .where(inArray(schema.authSessions.userId, [userA, userB]));
    await connection.db.delete(schema.authChallenges);
    await connection.db
      .delete(schema.authIdentities)
      .where(inArray(schema.authIdentities.userId, [userA, userB]));
    await connection.db
      .delete(schema.memberships)
      .where(
        inArray(schema.memberships.organizationId, [
          organizationA,
          organizationB,
        ]),
      );
    await connection.db
      .delete(schema.users)
      .where(inArray(schema.users.id, [userA, userB]));
    await connection.db
      .delete(schema.organizations)
      .where(inArray(schema.organizations.id, [organizationA, organizationB]));
    await connection.close();
  });

  it("consumes an OIDC challenge exactly once and sanitizes return paths", async () => {
    await createAuthChallenge(connection.db, {
      state: "single-use-state",
      codeVerifier: "pkce-verifier",
      nonce: "oidc-nonce",
      returnTo: "/\\attacker.test/escape",
      pepper,
    });
    const consumed = await consumeAuthChallenge(
      connection.db,
      "single-use-state",
      pepper,
    );
    expect(consumed?.returnTo).toBe("/app");
    expect(
      await consumeAuthChallenge(connection.db, "single-use-state", pepper),
    ).toBeNull();
  });

  it("accepts only pre-provisioned identities with exactly one active membership", async () => {
    const identity = await resolveProvisionedOidcIdentity(
      connection.db,
      "https://identity.test",
      "subject-a",
    );
    expect(identity.membership.organizationId).toBe(organizationA);
    await expect(
      resolveProvisionedOidcIdentity(
        connection.db,
        "https://identity.test",
        "unknown",
      ),
    ).rejects.toThrow("exactly one");
  });

  it("stores only a session-token hash and rechecks active membership", async () => {
    await expect(
      createDatabaseSession(connection.db, {
        userId: userB,
        organizationId: organizationA,
        pepper,
      }),
    ).rejects.toThrow("lacks an active");
    const created = await createDatabaseSession(connection.db, {
      userId: userA,
      organizationId: organizationA,
      pepper,
    });
    expect(created.token).toHaveLength(43);
    expect(created.session.tokenHash).toBe(
      operationalFingerprint(created.token, pepper),
    );
    expect(created.session.tokenHash).not.toContain(created.token);
    expect(
      (await resolveDatabaseSession(connection.db, created.token, pepper))
        ?.membership.organizationId,
    ).toBe(organizationA);
    await revokeDatabaseSession(connection.db, created.token, pepper);
    expect(
      await resolveDatabaseSession(connection.db, created.token, pepper),
    ).toBeNull();
  });

  it("increments a shared PostgreSQL bucket atomically and fails closed", async () => {
    const input = {
      scope: "test:hardening",
      subject: randomUUID(),
      limit: 2,
      windowSeconds: 60,
      pepper,
    };
    const results = await Promise.allSettled([
      enforceDatabaseRateLimit(connection.db, input),
      enforceDatabaseRateLimit(connection.db, input),
      enforceDatabaseRateLimit(connection.db, input),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(2);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected).toBeDefined();
    if (rejected?.status === "rejected")
      expect(rejected.reason).toBeInstanceOf(RateLimitExceededError);
  });
});
