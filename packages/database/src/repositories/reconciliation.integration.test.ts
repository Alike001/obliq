import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray } from "drizzle-orm";
import { createDatabase, schema } from "../index";
import {
  createObservationTarget,
  ingestShieldedObservation,
  listObligationObservations,
  recordObserverStatus,
  verifyAuditChain,
} from "./index";
import { memoReferenceHash, receiverFingerprint } from "@obliq/zcash";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("shielded observation repositories", () => {
  const connection = createDatabase(databaseUrl!);
  const organizationA = randomUUID();
  const organizationB = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();
  const financeUser = randomUUID();
  const vendorA = randomUUID();
  const sourceA = randomUUID();
  const obligationA = randomUUID();
  const actorA = { organizationId: organizationA, userId: userA };
  const actorB = { organizationId: organizationB, userId: userB };
  const financeActor = { organizationId: organizationA, userId: financeUser };
  const receiver = receiverFingerprint("unique-shielded-receiver");
  const reference = "obliq:v1:opaque-test-reference";

  beforeAll(async () => {
    await connection.db.insert(schema.organizations).values([
      { id: organizationA, name: "Observer tenant A" },
      { id: organizationB, name: "Observer tenant B" },
    ]);
    await connection.db.insert(schema.users).values([
      { id: userA, email: `${userA}@test.obliq` },
      { id: userB, email: `${userB}@test.obliq` },
      { id: financeUser, email: `${financeUser}@test.obliq` },
    ]);
    await connection.db.insert(schema.memberships).values([
      { organizationId: organizationA, userId: userA, role: "OWNER" },
      { organizationId: organizationB, userId: userB, role: "OWNER" },
      { organizationId: organizationA, userId: financeUser, role: "FINANCE" },
    ]);
    await connection.db.insert(schema.vendors).values({
      id: vendorA,
      organizationId: organizationA,
      legalName: "Tracer Vendor Ltd",
      displayName: "Tracer Vendor",
    });
    await connection.db.insert(schema.obligationSources).values({
      id: sourceA,
      organizationId: organizationA,
      kind: "MANUAL",
    });
    await connection.db.insert(schema.obligations).values({
      id: obligationA,
      organizationId: organizationA,
      vendorId: vendorA,
      type: "VENDOR_INVOICE",
      reference: "TRACE-001",
      currency: "ZEC",
      amountMinor: 125_000_000n,
      description: "Read-only reconciliation tracer",
      state: "READY_TO_SETTLE",
      sourceId: sourceA,
      createdBy: userA,
    });
  });

  afterAll(async () => {
    const organizations = [organizationA, organizationB];
    await connection.db
      .delete(schema.auditEvents)
      .where(inArray(schema.auditEvents.organizationId, organizations));
    await connection.db
      .delete(schema.settlementObservations)
      .where(
        inArray(schema.settlementObservations.organizationId, organizations),
      );
    await connection.db
      .delete(schema.settlementObservationTargets)
      .where(
        inArray(
          schema.settlementObservationTargets.organizationId,
          organizations,
        ),
      );
    await connection.db
      .delete(schema.zcashObserverStatuses)
      .where(
        inArray(schema.zcashObserverStatuses.organizationId, organizations),
      );
    await connection.db
      .delete(schema.obligations)
      .where(eq(schema.obligations.id, obligationA));
    await connection.db
      .delete(schema.obligationSources)
      .where(eq(schema.obligationSources.id, sourceA));
    await connection.db
      .delete(schema.vendors)
      .where(eq(schema.vendors.id, vendorA));
    await connection.db
      .delete(schema.memberships)
      .where(inArray(schema.memberships.organizationId, organizations));
    await connection.db
      .delete(schema.users)
      .where(inArray(schema.users.id, [userA, userB, financeUser]));
    await connection.db
      .delete(schema.organizations)
      .where(inArray(schema.organizations.id, organizations));
    await connection.close();
  });

  it("enforces tenant scope, idempotency, and confirmation progression", async () => {
    await expect(
      createObservationTarget(connection.db, financeActor, {
        obligationId: obligationA,
        network: "regtest",
        receiverFingerprint: receiver,
        memoReferenceHash: memoReferenceHash(reference),
        expectedAmountZat: 125_000_000n,
        requiredConfirmations: 3,
      }),
    ).rejects.toThrow("cannot operate shielded reconciliation");
    expect(
      await createObservationTarget(connection.db, actorB, {
        obligationId: obligationA,
        network: "regtest",
        receiverFingerprint: receiver,
        memoReferenceHash: memoReferenceHash(reference),
        expectedAmountZat: 125_000_000n,
        requiredConfirmations: 3,
      }),
    ).toBeNull();
    await createObservationTarget(connection.db, actorA, {
      obligationId: obligationA,
      network: "regtest",
      receiverFingerprint: receiver,
      memoReferenceHash: memoReferenceHash(reference),
      expectedAmountZat: 125_000_000n,
      requiredConfirmations: 3,
    });
    const base = {
      network: "regtest" as const,
      txid: "17e402b28c31fb21f4cc3ca74856cf04634143ca79f1ce10512b6287a08e8d56",
      outputIndex: 1,
      pool: "IRONWOOD" as const,
      amountZat: 125_000_000n,
      minedHeight: 115,
      confirmations: 1,
      receiverFingerprint: receiver,
      memoReference: reference,
      observedAt: new Date("2026-10-06T05:30:00Z"),
      observerSource: "librustzcash-0.24.0",
    };
    expect(
      await ingestShieldedObservation(connection.db, actorB, base),
    ).toEqual({ outcome: "UNMATCHED", reason: "UNKNOWN_RECEIVER" });
    expect(
      (await ingestShieldedObservation(connection.db, actorA, base)).changed,
    ).toBe(true);
    expect(
      (await ingestShieldedObservation(connection.db, actorA, base)).changed,
    ).toBe(false);
    expect(
      await listObligationObservations(
        connection.db,
        organizationB,
        obligationA,
      ),
    ).toEqual([]);
    const progressed = await ingestShieldedObservation(connection.db, actorA, {
      ...base,
      confirmations: 3,
      observedAt: new Date("2026-10-06T05:32:00Z"),
    });
    expect(progressed.outcome).toBe("STORED");
    if (progressed.outcome === "STORED")
      expect(progressed.observation.state).toBe("SETTLED");
    const reorgRegression = await ingestShieldedObservation(
      connection.db,
      actorA,
      {
        ...base,
        confirmations: 1,
        observedAt: new Date("2026-10-06T05:33:00Z"),
      },
    );
    if (reorgRegression.outcome === "STORED")
      expect(reorgRegression.observation.state).toBe("CONFIRMING");
    await ingestShieldedObservation(connection.db, actorA, {
      ...base,
      confirmations: 3,
      observedAt: new Date("2026-10-06T05:34:00Z"),
    });
    const concurrent = {
      ...base,
      txid: "cd".repeat(32),
      confirmations: 1,
      observedAt: new Date("2026-10-06T05:35:00Z"),
    };
    await Promise.all([
      ingestShieldedObservation(connection.db, actorA, concurrent),
      ingestShieldedObservation(connection.db, actorA, concurrent),
    ]);
    expect(
      await listObligationObservations(
        connection.db,
        organizationA,
        obligationA,
      ),
    ).toHaveLength(2);
    await expect(
      ingestShieldedObservation(connection.db, actorA, {
        ...concurrent,
        amountZat: 125_000_001n,
      }),
    ).rejects.toThrow("Conflicting data for an existing shielded output");
    const sameIndexDifferentPool = await ingestShieldedObservation(
      connection.db,
      actorA,
      {
        ...concurrent,
        pool: "ORCHARD",
      },
    );
    expect(sameIndexDifferentPool.outcome).toBe("STORED");
  });

  it("records infrastructure failure without changing financial state", async () => {
    await recordObserverStatus(connection.db, actorA, {
      availability: "UNAVAILABLE",
      network: "regtest",
      reasonCode: "NODE_UNAVAILABLE",
    });
    const observations = await listObligationObservations(
      connection.db,
      organizationA,
      obligationA,
    );
    expect(
      observations.find(
        (observation) =>
          observation.txid ===
          "17e402b28c31fb21f4cc3ca74856cf04634143ca79f1ce10512b6287a08e8d56",
      )?.state,
    ).toBe("SETTLED");
    expect((await verifyAuditChain(connection.db, organizationA)).valid).toBe(
      true,
    );
  });
});
