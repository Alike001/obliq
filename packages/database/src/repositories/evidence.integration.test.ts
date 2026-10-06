import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, schema } from "../index";
import { memoReferenceHash, receiverFingerprint } from "@obliq/zcash";
import {
  changeEvidenceStatus,
  evidenceJsonArtifact,
  getEvidencePackage,
  issueEvidence,
  ingestShieldedObservation,
  listEvidencePackages,
  previewEvidence,
  verifyAuditChain,
  verifyPublicEvidence,
} from "./index";

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const suite = url ? describe : describe.skip;

suite("Phase 5 controlled financial evidence", () => {
  const connection = createDatabase(url!);
  const organizationId = randomUUID();
  const foreignOrganizationId = randomUUID();
  const ownerId = randomUUID();
  const financeId = randomUUID();
  const accountantId = randomUUID();
  const foreignOwnerId = randomUUID();
  const owner = { organizationId, userId: ownerId };
  const finance = { organizationId, userId: financeId };
  const accountant = { organizationId, userId: accountantId };
  let obligationId = "";
  let unsettledObligationId = "";

  beforeAll(async () => {
    await connection.db.insert(schema.organizations).values([
      { id: organizationId, name: "Evidence Test Organization" },
      { id: foreignOrganizationId, name: "Foreign Organization" },
    ]);
    await connection.db.insert(schema.users).values([
      { id: ownerId, email: `${ownerId}@evidence.test`, displayName: "Owner" },
      {
        id: financeId,
        email: `${financeId}@evidence.test`,
        displayName: "Finance",
      },
      {
        id: accountantId,
        email: `${accountantId}@evidence.test`,
        displayName: "Accountant",
      },
      {
        id: foreignOwnerId,
        email: `${foreignOwnerId}@evidence.test`,
        displayName: "Foreign owner",
      },
    ]);
    await connection.db.insert(schema.memberships).values([
      { organizationId, userId: ownerId, role: "OWNER" },
      { organizationId, userId: financeId, role: "FINANCE" },
      { organizationId, userId: accountantId, role: "ACCOUNTANT" },
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
        legalName: "Private Vendor Legal Name",
        displayName: "Private Vendor",
        category: "Infrastructure",
      })
      .returning();
    const [destination] = await connection.db
      .insert(schema.vendorDestinations)
      .values({
        organizationId,
        vendorId: vendor!.id,
        network: "ZCASH",
        receiver: `uregtest1${"q".repeat(90)}`,
        fingerprint: "destination-fingerprint-never-disclose",
        verificationStatus: "VERIFIED_MANUALLY",
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
        vendorId: vendor!.id,
        type: "VENDOR_INVOICE",
        reference: "EVIDENCE-001",
        currency: "USD",
        amountMinor: 125_00n,
        category: "Infrastructure",
        description: "Canonical evidence test",
        state: "SETTLED",
        sourceId: source!.id,
        destinationId: destination!.id,
        createdBy: ownerId,
        version: 3,
      })
      .returning();
    obligationId = obligation!.id;
    const [unsettled] = await connection.db
      .insert(schema.obligations)
      .values({
        organizationId,
        vendorId: vendor!.id,
        type: "VENDOR_INVOICE",
        reference: "NOT-SETTLED",
        currency: "USD",
        amountMinor: 10_00n,
        description: "Not eligible",
        state: "READY_TO_SETTLE",
        sourceId: source!.id,
        destinationId: destination!.id,
        createdBy: ownerId,
      })
      .returning();
    unsettledObligationId = unsettled!.id;
    const [policy] = await connection.db
      .insert(schema.policies)
      .values({
        organizationId,
        name: "Evidence policy",
        enabled: true,
        createdBy: ownerId,
      })
      .returning();
    const [policyVersion] = await connection.db
      .insert(schema.policyVersions)
      .values({
        organizationId,
        policyId: policy!.id,
        version: 1,
        configJson: {},
        createdBy: ownerId,
      })
      .returning();
    const [decision] = await connection.db
      .insert(schema.policyDecisions)
      .values({
        organizationId,
        obligationId,
        policyVersionId: policyVersion!.id,
        obligationVersion: 3,
        destinationId: destination!.id,
        result: "APPROVAL_REQUIRED",
        inputHash: "evidence-decision",
      })
      .returning();
    await connection.db.insert(schema.approvalRequirements).values({
      organizationId,
      obligationId,
      policyDecisionId: decision!.id,
      obligationVersion: 3,
      role: "FINANCE",
      requiredCount: 1,
      approvedCount: 1,
      reason: "Financial review",
      state: "APPROVED",
    });
    const [quote] = await connection.db
      .insert(schema.settlementQuotes)
      .values({
        organizationId,
        obligationId,
        obligationVersion: 3,
        businessCurrency: "USD",
        businessAmountMinor: 125_00n,
        zatoshiAmount: 25_000_000n,
        source: "REGTEST_FIXED",
        sourceKind: "CONTROLLED_REGTEST",
        idempotencyKey: "evidence-quote",
        expiresAt: new Date("2026-10-07T00:00:00.000Z"),
        createdBy: ownerId,
      })
      .returning();
    const [intent] = await connection.db
      .insert(schema.settlementIntents)
      .values({
        organizationId,
        obligationId,
        quoteId: quote!.id,
        policyDecisionId: decision!.id,
        vendorId: vendor!.id,
        destinationId: destination!.id,
        destinationReceiver: destination!.receiver,
        obligationVersion: 3,
        businessCurrency: "USD",
        businessAmountMinor: 125_00n,
        zatoshiAmount: 25_000_000n,
        quoteSource: "REGTEST_FIXED",
        quotedAt: new Date("2026-10-06T10:00:00.000Z"),
        quoteExpiresAt: new Date("2026-10-07T00:00:00.000Z"),
        network: "regtest",
        privacyMode: "SHIELDED",
        memoReferenceHash: "memo-hash-never-disclose",
        paymentRequestUri: "zcash:opaque",
        intentHash: "intent-hash",
        idempotencyKey: "evidence-intent",
        state: "SETTLED",
        preparedBy: ownerId,
      })
      .returning();
    const [settlement] = await connection.db
      .insert(schema.settlements)
      .values({
        organizationId,
        obligationId,
        intentId: intent!.id,
        state: "SETTLED",
        intentHash: intent!.intentHash,
        txRefPrivate: "ab".repeat(32),
        settledAt: new Date("2026-10-06T12:00:00.000Z"),
      })
      .returning();
    const memoReference = "obliq:v1:evidence-regression";
    const observedReceiver = "evidence-reduced-receiver";
    const [target] = await connection.db
      .insert(schema.settlementObservationTargets)
      .values({
        organizationId,
        obligationId,
        settlementId: settlement!.id,
        intentId: intent!.id,
        network: "regtest",
        receiverFingerprint: receiverFingerprint(observedReceiver),
        memoReferenceHash: memoReferenceHash(memoReference),
        expectedAmountZat: 25_000_000n,
        requiredConfirmations: 3,
      })
      .returning();
    await connection.db.insert(schema.settlementObservations).values({
      organizationId,
      obligationId,
      settlementId: settlement!.id,
      targetId: target!.id,
      network: "regtest",
      txid: "ab".repeat(32),
      outputIndex: 0,
      pool: "IRONWOOD",
      observerSource: "evidence-integration",
      blockHeight: 119n,
      confirmations: 3,
      observedAmountZat: 25_000_000n,
      memoReferenceHash: memoReferenceHash(memoReference),
      receiverFingerprint: receiverFingerprint(observedReceiver),
      correlationStatus: "MATCHED",
      state: "SETTLED",
      observedAt: new Date("2026-10-06T12:00:00.000Z"),
    });
  });

  afterAll(async () => {
    for (const table of [
      schema.evidenceDisclosures,
      schema.evidencePreviews,
      schema.evidencePackages,
      schema.settlementObservations,
      schema.settlementObservationTargets,
      schema.settlements,
      schema.settlementIntents,
      schema.settlementQuotes,
      schema.settlementReadiness,
      schema.approvals,
      schema.approvalRequirements,
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
      .where(
        inArray(schema.users.id, [
          ownerId,
          financeId,
          accountantId,
          foreignOwnerId,
        ]),
      );
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

  it("requires canonical settlement and a mandatory preview", async () => {
    await expect(
      previewEvidence(connection.db, owner, {
        obligationId: unsettledObligationId,
        template: "MINIMAL_PAYMENT_CONFIRMATION",
      }),
    ).rejects.toThrow("canonically settled");
    expect(await issueEvidence(connection.db, owner, randomUUID())).toBeNull();
  });

  it("issues minimal immutable JSON without accidental financial disclosure", async () => {
    const preview = await previewEvidence(connection.db, finance, {
      obligationId,
      template: "MINIMAL_PAYMENT_CONFIRMATION",
    });
    const issued = await issueEvidence(connection.db, finance, preview.id);
    expect(issued?.status).toBe("ACTIVE");
    const retry = await issueEvidence(connection.db, finance, preview.id);
    expect(retry?.id).toBe(issued?.id);
    const publicResult = await verifyPublicEvidence(
      connection.db,
      issued!.publicId,
    );
    expect(publicResult?.integrityValid).toBe(true);
    const json = evidenceJsonArtifact(issued!);
    expect(json).toContain("EVIDENCE-001");
    for (const forbidden of [
      "Private Vendor",
      "25000000",
      "abababab",
      "APPROVAL_SUMMARY",
      "destination-fingerprint",
      "memo-hash",
      "receiver-fingerprint",
    ])
      expect(json).not.toContain(forbidden);
    const stored = await getEvidencePackage(connection.db, finance, issued!.id);
    expect(stored?.artifactHash).toBe(issued?.artifactHash);
  });

  it("server-enforces sensitive disclosure and tenant isolation", async () => {
    await expect(
      previewEvidence(connection.db, finance, {
        obligationId,
        template: "ACCOUNTANT_EVIDENCE",
      }),
    ).rejects.toThrow("not authorized");
    const preview = await previewEvidence(connection.db, accountant, {
      obligationId,
      template: "ACCOUNTANT_EVIDENCE",
    });
    const issued = await issueEvidence(connection.db, accountant, preview.id);
    expect(issued?.artifactJson.claims.TRANSACTION_REFERENCE?.value).toBe(
      "ab".repeat(32),
    );
    const foreignActor = {
      organizationId: foreignOrganizationId,
      userId: foreignOwnerId,
    };
    await expect(
      previewEvidence(connection.db, foreignActor, {
        obligationId,
        template: "MINIMAL_PAYMENT_CONFIRMATION",
      }),
    ).rejects.toThrow("canonically settled");
    expect(
      await getEvidencePackage(connection.db, foreignActor, issued!.id),
    ).toBeNull();
    expect(await listEvidencePackages(connection.db, foreignActor)).toEqual([]);
  });

  it("blocks persisted artifact tampering at the database boundary", async () => {
    const preview = await previewEvidence(connection.db, owner, {
      obligationId,
      template: "VENDOR_RECEIPT",
    });
    const issued = await issueEvidence(connection.db, owner, preview.id);
    const tampered = structuredClone(issued!.artifactJson);
    tampered.claims.BUSINESS_AMOUNT!.value = {
      currency: "USD",
      minorUnits: "999999",
    };
    await expect(
      connection.db
        .update(schema.evidencePackages)
        .set({ artifactJson: tampered })
        .where(eq(schema.evidencePackages.id, issued!.id)),
    ).rejects.toThrow();
    expect(
      (await verifyPublicEvidence(connection.db, issued!.publicId))
        ?.integrityValid,
    ).toBe(true);
  });

  it("revokes and supersedes without rewriting historical artifacts", async () => {
    const firstPreview = await previewEvidence(connection.db, owner, {
      obligationId,
      template: "VENDOR_RECEIPT",
    });
    const first = await issueEvidence(connection.db, owner, firstPreview.id);
    const originalHash = first!.artifactHash;
    const successorPreview = await previewEvidence(connection.db, owner, {
      obligationId,
      template: "MINIMAL_PAYMENT_CONFIRMATION",
      supersedesPackageId: first!.id,
    });
    const successor = await issueEvidence(
      connection.db,
      owner,
      successorPreview.id,
    );
    expect(
      (await verifyPublicEvidence(connection.db, first!.publicId))?.evidence
        .status,
    ).toBe("SUPERSEDED");
    expect(
      (await verifyPublicEvidence(connection.db, first!.publicId))?.evidence
        .artifactHash,
    ).toBe(originalHash);
    expect(successor?.version).toBe(first!.version + 1);
    await expect(
      changeEvidenceStatus(connection.db, finance, successor!.id, "Incorrect"),
    ).rejects.toThrow("not authorized");
    const revoked = await changeEvidenceStatus(
      connection.db,
      owner,
      successor!.id,
      "Recipient should no longer rely on this package",
    );
    expect(revoked?.status).toBe("REVOKED");
    expect(
      (await verifyPublicEvidence(connection.db, successor!.publicId))?.evidence
        .status,
    ).toBe("REVOKED");
    expect((await verifyAuditChain(connection.db, organizationId)).valid).toBe(
      true,
    );
  });

  it("automatically revokes active evidence when confirmation regresses", async () => {
    const preview = await previewEvidence(connection.db, owner, {
      obligationId,
      template: "MINIMAL_PAYMENT_CONFIRMATION",
    });
    const issued = await issueEvidence(connection.db, owner, preview.id);
    await ingestShieldedObservation(connection.db, owner, {
      network: "regtest",
      txid: "ab".repeat(32),
      outputIndex: 0,
      pool: "IRONWOOD",
      amountZat: 25_000_000n,
      minedHeight: 119,
      confirmations: 1,
      receiverFingerprint: receiverFingerprint("evidence-reduced-receiver"),
      memoReference: "obliq:v1:evidence-regression",
      observerSource: "evidence-regression-test",
      observedAt: new Date("2026-10-06T12:05:00.000Z"),
    });
    const verified = await verifyPublicEvidence(
      connection.db,
      issued!.publicId,
    );
    expect(verified?.evidence.status).toBe("REVOKED");
    expect(verified?.evidence.statusReason).toContain("confirmation regressed");
    expect(verified?.integrityValid).toBe(true);
  });
});
