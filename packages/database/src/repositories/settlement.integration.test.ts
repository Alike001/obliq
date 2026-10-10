import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, schema } from "../index";
import {
  createControlledQualificationQuote,
  createControlledRegtestQuote,
  getSettlement,
  ingestShieldedObservation,
  prepareSettlementIntent,
  recordExternalBroadcast,
  recordExternalSigning,
  requestExternalSignature,
  verifyAuditChain,
} from "./index";
import { memoReferenceForIntent, receiverFingerprint } from "@obliq/zcash";

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const suite = url ? describe : describe.skip;

suite("Phase 4 non-custodial settlement repositories", () => {
  const connection = createDatabase(url!);
  const organizationId = randomUUID();
  const foreignOrganizationId = randomUUID();
  const ownerId = randomUUID();
  const foreignOwnerId = randomUUID();
  const receiver = `uregtest1${"q".repeat(90)}`;
  const actor = { organizationId, userId: ownerId };
  let obligationId = "";
  let settlementId = "";
  let intentId = "";
  let vendorId = "";
  let destinationId = "";
  let sourceId = "";
  let policyVersionId = "";
  const txid = "ab".repeat(32);

  beforeAll(async () => {
    await connection.db.insert(schema.organizations).values([
      { id: organizationId, name: "Settlement test" },
      { id: foreignOrganizationId, name: "Foreign settlement test" },
    ]);
    await connection.db.insert(schema.users).values([
      {
        id: ownerId,
        email: `${ownerId}@settlement.test`,
        displayName: "Owner",
      },
      {
        id: foreignOwnerId,
        email: `${foreignOwnerId}@settlement.test`,
        displayName: "Foreign",
      },
    ]);
    await connection.db.insert(schema.memberships).values([
      { organizationId, userId: ownerId, role: "OWNER" },
      {
        organizationId: foreignOrganizationId,
        userId: foreignOwnerId,
        role: "OWNER",
      },
    ]);
    const [vendor] = await connection.db
      .insert(schema.vendors)
      .values({
        organizationId,
        legalName: "Shielded Vendor",
        displayName: "Shielded Vendor",
      })
      .returning();
    vendorId = vendor!.id;
    const [destination] = await connection.db
      .insert(schema.vendorDestinations)
      .values({
        organizationId,
        vendorId: vendor!.id,
        network: "ZCASH",
        receiver,
        fingerprint: receiverFingerprint(receiver),
        verificationStatus: "VERIFIED_MANUALLY",
        verifiedAt: new Date(),
        verifiedBy: ownerId,
        verificationMethod: "Test ceremony",
        verificationNote: "Test-only receiver review",
      })
      .returning();
    destinationId = destination!.id;
    const [source] = await connection.db
      .insert(schema.obligationSources)
      .values({
        organizationId,
        kind: "MANUAL",
        metadataJson: {},
      })
      .returning();
    sourceId = source!.id;
    const [obligation] = await connection.db
      .insert(schema.obligations)
      .values({
        organizationId,
        vendorId: vendor!.id,
        type: "VENDOR_INVOICE",
        reference: "SET-001",
        currency: "USD",
        amountMinor: 12500n,
        description: "Settlement integration",
        state: "READY_TO_SETTLE",
        sourceId: source!.id,
        destinationId: destination!.id,
        createdBy: ownerId,
        version: 1,
      })
      .returning();
    obligationId = obligation!.id;
    const [policy] = await connection.db
      .insert(schema.policies)
      .values({
        organizationId,
        name: "Test policy",
        enabled: true,
        createdBy: ownerId,
      })
      .returning();
    const [version] = await connection.db
      .insert(schema.policyVersions)
      .values({
        organizationId,
        policyId: policy!.id,
        version: 1,
        configJson: {},
        createdBy: ownerId,
      })
      .returning();
    policyVersionId = version!.id;
    const [decision] = await connection.db
      .insert(schema.policyDecisions)
      .values({
        organizationId,
        obligationId,
        policyVersionId: version!.id,
        obligationVersion: 1,
        destinationId: destination!.id,
        result: "APPROVAL_REQUIRED",
        inputHash: "test-input",
      })
      .returning();
    await connection.db.insert(schema.settlementReadiness).values({
      organizationId,
      obligationId,
      obligationVersion: 1,
      policyDecisionId: decision!.id,
      destinationId: destination!.id,
      result: "READY",
      reasonsJson: [],
      evaluatedBy: ownerId,
    });
  });

  afterAll(async () => {
    for (const table of [
      schema.settlementObservations,
      schema.settlementObservationTargets,
      schema.settlements,
      schema.settlementIntents,
      schema.settlementQuotes,
      schema.settlementReadiness,
      schema.approvalRequirements,
      schema.approvals,
      schema.controlFindings,
      schema.policyDecisions,
      schema.policyVersions,
      schema.policies,
      schema.auditEvents,
      schema.obligationVersions,
      schema.obligations,
      schema.obligationSources,
      schema.vendorDestinations,
      schema.vendors,
      schema.memberships,
    ])
      await connection.db
        .delete(table)
        .where(
          inArray(table.organizationId, [
            organizationId,
            foreignOrganizationId,
          ]),
        );
    await connection.db
      .delete(schema.users)
      .where(inArray(schema.users.id, [ownerId, foreignOwnerId]));
    await connection.db
      .delete(schema.organizations)
      .where(
        inArray(schema.organizations.id, [
          organizationId,
          foreignOrganizationId,
        ]),
      );
    await connection.close();
  });

  it("binds an exact, idempotent quote and immutable settlement intent", async () => {
    await expect(
      createControlledRegtestQuote(
        connection.db,
        { organizationId: foreignOrganizationId, userId: foreignOwnerId },
        {
          obligationId,
          zatoshiAmount: 25_000_000n,
          idempotencyKey: "foreign-quote",
        },
      ),
    ).rejects.toThrow("readiness is unavailable");
    await expect(
      createControlledRegtestQuote(connection.db, actor, {
        obligationId,
        zatoshiAmount: 25_000_000n,
        idempotencyKey: "expired-quote",
        expiresAt: new Date(Date.now() - 1),
      }),
    ).rejects.toThrow("future");
    const quote = await createControlledRegtestQuote(connection.db, actor, {
      obligationId,
      zatoshiAmount: 25_000_000n,
      idempotencyKey: "quote-1",
      expiresAt: new Date(Date.now() + 60 * 60_000),
    });
    expect(
      (
        await createControlledRegtestQuote(connection.db, actor, {
          obligationId,
          zatoshiAmount: 25_000_000n,
          idempotencyKey: "quote-1",
        })
      ).id,
    ).toBe(quote.id);
    const intent = await prepareSettlementIntent(connection.db, actor, {
      quoteId: quote.id,
      idempotencyKey: "intent-1",
    });
    expect(intent).toMatchObject({
      network: "regtest",
      privacyMode: "SHIELDED",
      state: "AWAITING_SIGNATURE",
    });
    expect(intent!.paymentRequestUri).toContain("amount=0.25");
    expect(intent!.paymentRequestUri).not.toContain("Shielded Vendor");
    intentId = intent!.id;
    const record = await connection.db.select().from(schema.settlements);
    settlementId = record.find((item) => item.intentId === intentId)!.id;
    expect(
      (await prepareSettlementIntent(connection.db, actor, {
        quoteId: quote.id,
        idempotencyKey: "intent-1",
      }))!.id,
    ).toBe(intentId);
  });

  it("enforces tenant scope, sanitized receipts, and execution idempotency", async () => {
    expect(
      await getSettlement(connection.db, foreignOrganizationId, settlementId),
    ).toBeNull();
    const handoff = await requestExternalSignature(
      connection.db,
      actor,
      settlementId,
      "sign-1",
    );
    expect(handoff).toMatchObject({
      intentId,
      privacyPolicy: "FullPrivacy",
      amountZat: "25000000",
    });
    await expect(
      recordExternalSigning(connection.db, actor, {
        settlementId,
        signerRequestId: "sign-1",
        outcome: "AUTHORIZED",
        networkFeeZat: 10_000n,
        txid: "bad",
        signedTxHash: txid,
        signerVersion: "test",
      }),
    ).rejects.toThrow("sanitized external signing receipt");
    await expect(
      recordExternalSigning(connection.db, actor, {
        settlementId,
        signerRequestId: "sign-1",
        outcome: "AUTHORIZED",
        txid,
        signedTxHash: "cd".repeat(32),
        signerVersion: "v".repeat(65),
        networkFeeZat: 10_000n,
      }),
    ).rejects.toThrow("sanitized external signing receipt");
    await expect(
      recordExternalSigning(connection.db, actor, {
        settlementId,
        signerRequestId: "sign-1",
        outcome: "AUTHORIZED",
        txid,
        signedTxHash: "cd".repeat(32),
        signerVersion: "v0.1.0-beta.3",
      }),
    ).rejects.toThrow("sanitized external signing receipt");
    await expect(
      recordExternalSigning(connection.db, actor, {
        settlementId,
        signerRequestId: "sign-1",
        outcome: "AUTHORIZED",
        txid,
        signedTxHash: "cd".repeat(32),
        signerVersion: "v0.1.0-beta.3",
        networkFeeZat: 25_000_001n,
      }),
    ).rejects.toThrow("sanitized external signing receipt");
    const signed = await recordExternalSigning(connection.db, actor, {
      settlementId,
      signerRequestId: "sign-1",
      outcome: "AUTHORIZED",
      txid,
      signedTxHash: "cd".repeat(32),
      signerType: "ZALLET_PCZT",
      signerVersion: "v0.1.0-beta.3",
      networkFeeZat: 10_000n,
    });
    expect(signed?.state).toBe("SIGNED");
    expect(signed?.networkFeeZat).toBe(10_000n);
    expect(
      (await connection.db.select().from(schema.auditEvents)).find(
        (event) =>
          event.subjectId === settlementId &&
          event.eventType === "SIGNING_AUTHORIZED",
      )?.payloadJson,
    ).toMatchObject({ networkFeeZat: "10000" });
    await expect(
      recordExternalSigning(connection.db, actor, {
        settlementId,
        signerRequestId: "sign-1",
        outcome: "REJECTED",
      }),
    ).rejects.toThrow("already been finalized");
    expect(
      (
        await recordExternalSigning(connection.db, actor, {
          settlementId,
          signerRequestId: "sign-1",
          outcome: "AUTHORIZED",
          txid,
          signedTxHash: "cd".repeat(32),
          signerType: "ZALLET_PCZT",
          signerVersion: "v0.1.0-beta.3",
          networkFeeZat: 10_000n,
        })
      )?.state,
    ).toBe("SIGNED");
    await expect(
      recordExternalSigning(connection.db, actor, {
        settlementId,
        signerRequestId: "sign-1",
        outcome: "AUTHORIZED",
        txid,
        signedTxHash: "cd".repeat(32),
        signerType: "ZALLET_PCZT",
        signerVersion: "v0.1.0-beta.3",
        networkFeeZat: 20_000n,
      }),
    ).rejects.toThrow("Conflicting signing receipt");
    const broadcast = await recordExternalBroadcast(connection.db, actor, {
      settlementId,
      broadcastRequestId: "broadcast-1",
      txid,
      outcome: "UNKNOWN",
    });
    expect(broadcast?.state).toBe("BROADCAST_UNKNOWN");
    expect(
      (await connection.db.select().from(schema.obligations)).find(
        (item) => item.id === obligationId,
      )?.state,
    ).toBe("BROADCAST");
    expect(
      (
        await recordExternalBroadcast(connection.db, actor, {
          settlementId,
          broadcastRequestId: "broadcast-1",
          txid,
          outcome: "BROADCAST",
        })
      )?.state,
    ).toBe("BROADCAST");
    await expect(
      recordExternalBroadcast(connection.db, actor, {
        settlementId,
        broadcastRequestId: "conflicting-retry",
        txid,
        outcome: "BROADCAST",
      }),
    ).rejects.toThrow("Conflicting broadcast retry");
  });

  it("records signing rejection and signer unavailability without implying payment", async () => {
    const [obligation] = await connection.db
      .insert(schema.obligations)
      .values({
        organizationId,
        vendorId,
        type: "VENDOR_INVOICE",
        reference: "SET-FAILURE-001",
        currency: "USD",
        amountMinor: 5000n,
        description: "External signer failure semantics",
        state: "READY_TO_SETTLE",
        sourceId,
        destinationId,
        createdBy: ownerId,
        version: 1,
      })
      .returning();
    const [decision] = await connection.db
      .insert(schema.policyDecisions)
      .values({
        organizationId,
        obligationId: obligation!.id,
        policyVersionId,
        obligationVersion: 1,
        destinationId,
        result: "APPROVAL_REQUIRED",
        inputHash: "failure-input",
      })
      .returning();
    await connection.db.insert(schema.settlementReadiness).values({
      organizationId,
      obligationId: obligation!.id,
      obligationVersion: 1,
      policyDecisionId: decision!.id,
      destinationId,
      result: "READY",
      reasonsJson: [],
      evaluatedBy: ownerId,
    });

    const prepareAttempt = async (suffix: string) => {
      const quote = await createControlledRegtestQuote(connection.db, actor, {
        obligationId: obligation!.id,
        zatoshiAmount: 5_000_000n,
        idempotencyKey: `failure-quote-${suffix}`,
        expiresAt: new Date(Date.now() + 60 * 60_000),
      });
      const intent = await prepareSettlementIntent(connection.db, actor, {
        quoteId: quote.id,
        idempotencyKey: `failure-intent-${suffix}`,
      });
      const settlement = (
        await connection.db.select().from(schema.settlements)
      ).find((item) => item.intentId === intent!.id)!;
      await requestExternalSignature(
        connection.db,
        actor,
        settlement.id,
        `failure-sign-${suffix}`,
      );
      return { intent: intent!, settlement };
    };

    const rejected = await prepareAttempt("rejected");
    expect(
      (
        await recordExternalSigning(connection.db, actor, {
          settlementId: rejected.settlement.id,
          signerRequestId: "failure-sign-rejected",
          outcome: "REJECTED",
          errorCode: "USER_DECLINED",
        })
      )?.state,
    ).toBe("SIGNING_REJECTED");
    expect(
      (await connection.db.select().from(schema.obligations)).find(
        (item) => item.id === obligation!.id,
      )?.state,
    ).toBe("READY_TO_SETTLE");

    const unavailable = await prepareAttempt("unavailable");
    expect(
      (
        await recordExternalSigning(connection.db, actor, {
          settlementId: unavailable.settlement.id,
          signerRequestId: "failure-sign-unavailable",
          outcome: "UNAVAILABLE",
          errorCode: "SIGNER_OFFLINE",
        })
      )?.state,
    ).toBe("UNAVAILABLE");
    expect(
      (await connection.db.select().from(schema.obligations)).find(
        (item) => item.id === obligation!.id,
      )?.state,
    ).toBe("SETTLEMENT_FAILED");
    const unauthorizedObservation = await ingestShieldedObservation(
      connection.db,
      actor,
      {
        network: "regtest",
        txid: "12".repeat(32),
        outputIndex: 0,
        pool: "IRONWOOD",
        amountZat: 5_000_000n,
        minedHeight: 200,
        confirmations: 3,
        receiverFingerprint: receiverFingerprint(receiver),
        memoReference: memoReferenceForIntent(unavailable.intent.id),
        observerSource: "integration-fixture",
        observedAt: new Date(),
      },
    );
    expect(unauthorizedObservation.observation?.state).toBe("MISMATCH");
    expect(unauthorizedObservation.observation?.reasonsJson).toEqual([
      expect.objectContaining({ code: "TRANSACTION_NOT_AUTHORIZED" }),
    ]);
  });

  it("settles only from the read-only observer and records confirmation progression idempotently", async () => {
    const common = {
      network: "regtest" as const,
      txid,
      outputIndex: 0,
      pool: "IRONWOOD" as const,
      amountZat: 25_000_000n,
      minedHeight: 150,
      receiverFingerprint: receiverFingerprint(receiver),
      memoReference: memoReferenceForIntent(intentId),
      observerSource: "integration-fixture",
      observedAt: new Date(),
    };
    const mismatch = await ingestShieldedObservation(connection.db, actor, {
      ...common,
      txid: "ef".repeat(32),
      confirmations: 1,
    });
    expect(mismatch.observation!.state).toBe("MISMATCH");
    expect(
      (await getSettlement(connection.db, organizationId, settlementId))
        ?.settlement.state,
    ).toBe("MISMATCH");
    expect(
      (await connection.db.select().from(schema.obligations)).find(
        (item) => item.id === obligationId,
      )?.state,
    ).toBe("RECONCILIATION_EXCEPTION");
    expect(
      (
        await ingestShieldedObservation(connection.db, actor, {
          ...common,
          confirmations: 1,
        })
      ).observation!.state,
    ).toBe("CONFIRMING");
    expect(
      (
        await ingestShieldedObservation(connection.db, actor, {
          ...common,
          confirmations: 1,
        })
      ).changed,
    ).toBe(false);
    expect(
      (
        await ingestShieldedObservation(connection.db, actor, {
          ...common,
          confirmations: 3,
        })
      ).observation!.state,
    ).toBe("SETTLED");
    expect(
      (await getSettlement(connection.db, organizationId, settlementId))
        ?.settlement.state,
    ).toBe("SETTLED");
    expect(
      (await connection.db.select().from(schema.obligations)).find(
        (item) => item.id === obligationId,
      )?.state,
    ).toBe("SETTLED");
    expect((await verifyAuditChain(connection.db, organizationId)).valid).toBe(
      true,
    );
  });

  it("prepares a testnet-only qualification intent without changing the regtest path", async () => {
    const testnetReceiver = `utest1${"p".repeat(90)}`;
    await connection.db
      .update(schema.vendorDestinations)
      .set({ verificationStatus: "SUPERSEDED", supersededAt: new Date() })
      .where(
        and(
          eq(schema.vendorDestinations.organizationId, organizationId),
          eq(schema.vendorDestinations.vendorId, vendorId),
          isNull(schema.vendorDestinations.supersededAt),
        ),
      );
    const [destination] = await connection.db
      .insert(schema.vendorDestinations)
      .values({
        organizationId,
        vendorId,
        version: 2,
        supersedesDestinationId: destinationId,
        network: "ZCASH",
        receiver: testnetReceiver,
        fingerprint: receiverFingerprint(testnetReceiver),
        verificationStatus: "VERIFIED_MANUALLY",
        verifiedAt: new Date(),
        verifiedBy: ownerId,
        verificationMethod: "Public testnet qualification",
      })
      .returning();
    const [source] = await connection.db
      .insert(schema.obligationSources)
      .values({ organizationId, kind: "MANUAL", metadataJson: {} })
      .returning();
    const [obligation] = await connection.db
      .insert(schema.obligations)
      .values({
        organizationId,
        vendorId,
        type: "VENDOR_INVOICE",
        reference: "PUBLIC-TESTNET-001",
        currency: "USD",
        amountMinor: 100n,
        description: "Public testnet qualification",
        state: "READY_TO_SETTLE",
        sourceId: source!.id,
        destinationId: destination!.id,
        createdBy: ownerId,
        version: 1,
      })
      .returning();
    const [decision] = await connection.db
      .insert(schema.policyDecisions)
      .values({
        organizationId,
        obligationId: obligation!.id,
        policyVersionId,
        obligationVersion: 1,
        destinationId: destination!.id,
        result: "APPROVAL_REQUIRED",
        inputHash: "public-testnet-input",
      })
      .returning();
    await connection.db.insert(schema.settlementReadiness).values({
      organizationId,
      obligationId: obligation!.id,
      obligationVersion: 1,
      policyDecisionId: decision!.id,
      destinationId: destination!.id,
      result: "READY",
      reasonsJson: [],
      evaluatedBy: ownerId,
    });
    await expect(
      createControlledQualificationQuote(connection.db, actor, {
        obligationId: obligation!.id,
        zatoshiAmount: 100_000n,
        idempotencyKey: "mainnet-must-fail",
        network: "mainnet" as never,
      }),
    ).rejects.toThrow("not eligible");
    const quote = await createControlledQualificationQuote(
      connection.db,
      actor,
      {
        obligationId: obligation!.id,
        zatoshiAmount: 100_000n,
        idempotencyKey: "public-testnet-quote",
        network: "testnet",
        expiresAt: new Date(Date.now() + 60 * 60_000),
      },
    );
    expect(quote).toMatchObject({
      source: "TESTNET_FIXED",
      sourceKind: "CONTROLLED_TESTNET",
    });
    const intent = await prepareSettlementIntent(connection.db, actor, {
      quoteId: quote.id,
      idempotencyKey: "public-testnet-intent",
    });
    expect(intent).toMatchObject({
      network: "testnet",
      zatoshiAmount: 100_000n,
      state: "AWAITING_SIGNATURE",
    });
    expect(intent!.paymentRequestUri).toMatch(
      /^zcash:utest1.*amount=0\.001&memo=/u,
    );
    const [settlement] = await connection.db
      .select()
      .from(schema.settlements)
      .where(eq(schema.settlements.intentId, intent!.id))
      .limit(1);
    const handoff = await requestExternalSignature(
      connection.db,
      actor,
      settlement!.id,
      "public-testnet-signing-request",
    );
    expect(handoff).toMatchObject({
      network: "testnet",
      amountZat: "100000",
      privacyPolicy: "FullPrivacy",
    });
  });
});
