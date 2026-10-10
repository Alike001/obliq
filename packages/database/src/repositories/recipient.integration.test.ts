import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDatabase, schema } from "../index";
import type { RecipientWorkflowError } from "./index";
import {
  addVendorDestination,
  confirmRecipientDestination,
  createObligation,
  createRecipientChallenge,
  createRecipientInvitation,
  createVendor,
  expireRecipientInvitations,
  getRecipientChallengeContext,
  getRecipientVerificationContext,
  ingestShieldedObservation,
  revokeRecipientInvitation,
  verifyAuditChain,
  verifyDestinationManually,
  verifyRecipientContact,
} from "./index";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

suite("private payables recipient boundary", () => {
  const connection = createDatabase(databaseUrl!);
  const organizationA = randomUUID();
  const organizationB = randomUUID();
  const issuerId = randomUUID();
  const reviewerId = randomUUID();
  const outsiderId = randomUUID();
  const actor = { organizationId: organizationA, userId: issuerId };
  const reviewer = { organizationId: organizationA, userId: reviewerId };
  const outsider = { organizationId: organizationB, userId: outsiderId };
  let vendorId = "";
  let obligationId = "";
  let initialDestinationId = "";
  let sourceId = "";

  async function createVerifiedRecipientSession(
    label: string,
    boundObligationId = obligationId,
  ) {
    const tokenHash = digest(`${label}-invitation`);
    const { invitation } = await createRecipientInvitation(
      connection.db,
      actor,
      {
        obligationId: boundObligationId,
        tokenHash,
        contactPepper: "v".repeat(32),
        network: "regtest",
      },
    );
    const challengeId = randomUUID();
    const codeHash = digest(`${label}-code`);
    await createRecipientChallenge(connection.db, {
      invitationId: invitation.id,
      organizationId: organizationA,
      challengeId,
      codeHash,
    });
    const context = await getRecipientVerificationContext(
      connection.db,
      tokenHash,
    );
    const sessionTokenHash = digest(`${label}-session`);
    const session = await verifyRecipientContact(connection.db, {
      ...context!,
      codeHash,
      sessionId: randomUUID(),
      sessionTokenHash,
    });
    const receiver = `uregtest1${digest(label).repeat(2)}`;
    return {
      invitation,
      session,
      confirmation: {
        sessionTokenHash,
        receiver,
        receiverFingerprint: digest(receiver),
        network: "regtest",
        idempotencyKeyHash: digest(`${label}-idempotency`),
        requestHash: digest(`${label}-request`),
      },
    };
  }

  async function createSettlementFixture(
    label: string,
    obligationState: "SIGNING" | "BROADCAST",
    executionState: "AWAITING_SIGNATURE" | "SIGNED" | "BROADCAST",
  ) {
    const [destination] = await connection.db
      .select()
      .from(schema.vendorDestinations)
      .where(
        and(
          eq(schema.vendorDestinations.organizationId, organizationA),
          eq(schema.vendorDestinations.vendorId, vendorId),
          isNull(schema.vendorDestinations.supersededAt),
        ),
      )
      .limit(1);
    const [policyVersion] = await connection.db
      .select()
      .from(schema.policyVersions)
      .where(eq(schema.policyVersions.organizationId, organizationA))
      .limit(1);
    if (!destination || !policyVersion) throw new Error("Fixture unavailable");
    const [obligation] = await connection.db
      .insert(schema.obligations)
      .values({
        organizationId: organizationA,
        vendorId,
        type: "VENDOR_INVOICE",
        reference: `PPL-${label}`,
        currency: "USD",
        amountMinor: 2500n,
        description: `Settlement boundary ${label}`,
        state: obligationState,
        sourceId,
        destinationId: destination.id,
        createdBy: issuerId,
        version: 1,
      })
      .returning();
    const [decision] = await connection.db
      .insert(schema.policyDecisions)
      .values({
        organizationId: organizationA,
        obligationId: obligation!.id,
        policyVersionId: policyVersion.id,
        obligationVersion: 1,
        destinationId: destination.id,
        result: "APPROVAL_REQUIRED",
        inputHash: digest(`${label}-policy`),
      })
      .returning();
    const [quote] = await connection.db
      .insert(schema.settlementQuotes)
      .values({
        organizationId: organizationA,
        obligationId: obligation!.id,
        obligationVersion: 1,
        businessCurrency: "USD",
        businessAmountMinor: 2500n,
        zatoshiAmount: 100000n,
        source: "REGTEST_CONTROLLED",
        sourceKind: "CONTROLLED_TEST",
        idempotencyKey: randomUUID(),
        expiresAt: new Date(Date.now() + 60_000),
        createdBy: issuerId,
      })
      .returning();
    const intentHash = digest(`${label}-intent`);
    const [intent] = await connection.db
      .insert(schema.settlementIntents)
      .values({
        organizationId: organizationA,
        obligationId: obligation!.id,
        quoteId: quote!.id,
        policyDecisionId: decision!.id,
        vendorId,
        destinationId: destination.id,
        destinationReceiver: destination.receiver,
        obligationVersion: 1,
        businessCurrency: "USD",
        businessAmountMinor: 2500n,
        zatoshiAmount: 100000n,
        quoteSource: "REGTEST_CONTROLLED",
        quotedAt: new Date(),
        quoteExpiresAt: new Date(Date.now() + 60_000),
        network: "regtest",
        privacyMode: "SHIELDED",
        memoReferenceHash: digest(`${label}-memo`),
        paymentRequestUri: "zcash:private",
        intentHash,
        idempotencyKey: randomUUID(),
        state: executionState,
        preparedBy: issuerId,
      })
      .returning();
    const [settlement] = await connection.db
      .insert(schema.settlements)
      .values({
        organizationId: organizationA,
        obligationId: obligation!.id,
        intentId: intent!.id,
        state: executionState,
        intentHash,
        ...(executionState === "SIGNED" || executionState === "BROADCAST"
          ? {
              signerRequestId: `${label}-sign`,
              signerType: "ZALLET_PCZT",
              signerVersion: "test",
              networkFeeZat: 10_000n,
              signedTxHash: digest(`${label}-signed`),
              txRefPrivate: digest(`${label}-txid`),
              signedAt: new Date(),
            }
          : {}),
        ...(executionState === "BROADCAST"
          ? {
              broadcastRequestId: `${label}-broadcast`,
              broadcastAt: new Date(),
            }
          : {}),
      })
      .returning();
    return {
      obligation: obligation!,
      decision: decision!,
      quote: quote!,
      intent: intent!,
      settlement: settlement!,
      destination,
    };
  }

  beforeAll(async () => {
    await connection.db.insert(schema.organizations).values([
      { id: organizationA, name: "Payables A" },
      { id: organizationB, name: "Payables B" },
    ]);
    await connection.db.insert(schema.users).values([
      { id: issuerId, email: `${issuerId}@test.obliq` },
      { id: reviewerId, email: `${reviewerId}@test.obliq` },
      { id: outsiderId, email: `${outsiderId}@test.obliq` },
    ]);
    await connection.db.insert(schema.memberships).values([
      { organizationId: organizationA, userId: issuerId, role: "CFO" },
      { organizationId: organizationA, userId: reviewerId, role: "TREASURY" },
      { organizationId: organizationB, userId: outsiderId, role: "OWNER" },
    ]);
    const vendor = await createVendor(connection.db, actor, {
      legalName: "Recipient Test Vendor Limited",
      displayName: "Recipient Test Vendor",
      contactEmail: "payables-recipient@example.test",
    });
    vendorId = vendor.id;
    const initial = await addVendorDestination(
      connection.db,
      actor,
      vendor.id,
      {
        network: "ZCASH",
        receiver: `uregtest1${"a".repeat(90)}`,
      },
    );
    initialDestinationId = initial!.id;
    await verifyDestinationManually(
      connection.db,
      reviewer,
      initial!.id,
      "Known contact",
      "Confirmed before invitation",
    );
    sourceId = randomUUID();
    await connection.db.insert(schema.obligationSources).values({
      id: sourceId,
      organizationId: organizationA,
      kind: "MANUAL",
      metadataJson: {},
    });
    const obligation = await createObligation(connection.db, actor, {
      vendorId,
      sourceId,
      type: "VENDOR_INVOICE",
      reference: "PPL-001",
      currency: "USD",
      amount: "125.00",
      dueDate: "2026-12-01",
      description: "Private payables vertical slice",
    });
    obligationId = obligation.id;
    const policyId = randomUUID();
    const policyVersionId = randomUUID();
    const decisionId = randomUUID();
    const requirementId = randomUUID();
    await connection.db.insert(schema.policies).values({
      id: policyId,
      organizationId: organizationA,
      name: "Test policy",
      enabled: true,
      createdBy: issuerId,
    });
    await connection.db.insert(schema.policyVersions).values({
      id: policyVersionId,
      organizationId: organizationA,
      policyId,
      version: 1,
      configJson: {},
      createdBy: issuerId,
    });
    await connection.db.insert(schema.policyDecisions).values({
      id: decisionId,
      organizationId: organizationA,
      obligationId,
      policyVersionId,
      obligationVersion: 1,
      destinationId: initialDestinationId,
      result: "APPROVAL_REQUIRED",
      inputHash: digest("policy-input"),
    });
    await connection.db.insert(schema.approvalRequirements).values({
      id: requirementId,
      organizationId: organizationA,
      obligationId,
      policyDecisionId: decisionId,
      obligationVersion: 1,
      role: "FINANCE",
      requiredCount: 1,
      approvedCount: 1,
      reason: "Test approval",
      state: "APPROVED",
    });
    await connection.db.insert(schema.approvals).values({
      organizationId: organizationA,
      obligationId,
      actorId: reviewerId,
      requirementId,
      policyDecisionId: decisionId,
      decision: "APPROVE",
      capacityRole: "TREASURY",
      obligationVersion: 1,
    });
    const quoteId = randomUUID();
    await connection.db.insert(schema.settlementQuotes).values({
      id: quoteId,
      organizationId: organizationA,
      obligationId,
      obligationVersion: 1,
      businessCurrency: "USD",
      businessAmountMinor: 12500n,
      zatoshiAmount: 100000n,
      source: "REGTEST_CONTROLLED",
      sourceKind: "CONTROLLED_TEST",
      idempotencyKey: randomUUID(),
      expiresAt: new Date(Date.now() + 60_000),
      createdBy: issuerId,
    });
    await connection.db.insert(schema.settlementIntents).values({
      organizationId: organizationA,
      obligationId,
      quoteId,
      policyDecisionId: decisionId,
      vendorId,
      destinationId: initialDestinationId,
      destinationReceiver: `uregtest1${"a".repeat(90)}`,
      obligationVersion: 1,
      businessCurrency: "USD",
      businessAmountMinor: 12500n,
      zatoshiAmount: 100000n,
      quoteSource: "REGTEST_CONTROLLED",
      quotedAt: new Date(),
      quoteExpiresAt: new Date(Date.now() + 60_000),
      network: "regtest",
      privacyMode: "SHIELDED",
      memoReferenceHash: digest("memo"),
      paymentRequestUri: "zcash:private",
      intentHash: digest("intent"),
      idempotencyKey: randomUUID(),
      preparedBy: issuerId,
    });
    await connection.db
      .update(schema.obligations)
      .set({ state: "READY_TO_SETTLE", destinationId: initialDestinationId })
      .where(eq(schema.obligations.id, obligationId));
  });

  afterAll(async () => {
    const organizations = [organizationA, organizationB];
    for (const table of [
      schema.destinationAttestations,
      schema.recipientOperationReceipts,
      schema.recipientSessions,
      schema.recipientVerificationChallenges,
      schema.recipientInvitations,
      schema.auditEvents,
      schema.settlementObservations,
      schema.settlementObservationTargets,
      schema.settlements,
      schema.settlementIntents,
      schema.settlementQuotes,
      schema.approvals,
      schema.approvalRequirements,
      schema.controlFindings,
      schema.policyDecisions,
      schema.policyVersions,
      schema.policies,
      schema.obligationVersions,
      schema.obligations,
      schema.obligationSources,
      schema.vendorDestinations,
      schema.vendors,
      schema.memberships,
    ])
      await connection.db
        .delete(table)
        .where(inArray(table.organizationId, organizations));
    await connection.db
      .delete(schema.users)
      .where(inArray(schema.users.id, [issuerId, reviewerId, outsiderId]));
    await connection.db
      .delete(schema.organizations)
      .where(inArray(schema.organizations.id, organizations));
    await connection.close();
  });

  it("atomically confirms one immutable destination and invalidates authorization", async () => {
    const invitationTokenHash = digest("invitation-token");
    const { invitation } = await createRecipientInvitation(
      connection.db,
      actor,
      {
        obligationId,
        tokenHash: invitationTokenHash,
        contactPepper: "p".repeat(32),
        network: "regtest",
      },
    );
    expect(
      invitation.expiresAt.getTime() - invitation.createdAt.getTime(),
    ).toBeGreaterThanOrEqual(24 * 60 * 60 * 1_000 - 10);
    await expect(
      revokeRecipientInvitation(
        connection.db,
        outsider,
        invitation.id,
        "SECURITY_CONCERN",
      ),
    ).resolves.toBeNull();

    const challengeId = randomUUID();
    const codeHash = digest("challenge-code");
    await createRecipientChallenge(connection.db, {
      invitationId: invitation.id,
      organizationId: organizationA,
      challengeId,
      codeHash,
    });
    const context = await getRecipientVerificationContext(
      connection.db,
      invitationTokenHash,
    );
    expect(context).toMatchObject({ challengeId, invitationId: invitation.id });
    const sessionId = randomUUID();
    const sessionHash = digest("session-token");
    const session = await verifyRecipientContact(connection.db, {
      ...context!,
      codeHash,
      sessionId,
      sessionTokenHash: sessionHash,
    });
    expect(
      session.expiresAt.getTime() - session.contactVerifiedAt.getTime(),
    ).toBe(30 * 60 * 1_000);

    const receiver = `uregtest1${"b".repeat(90)}`;
    const receiverFingerprint = digest(receiver);
    const idempotencyKeyHash = digest("idempotency");
    const requestHash = digest("canonical-request");
    const first = await confirmRecipientDestination(connection.db, {
      sessionTokenHash: sessionHash,
      receiver,
      receiverFingerprint,
      network: "regtest",
      idempotencyKeyHash,
      requestHash,
    });
    expect(first.recovered).toBe(false);
    expect(first.destination).toMatchObject({
      version: 2,
      supersedesDestinationId: initialDestinationId,
      verificationStatus: "UNVERIFIED",
      recipientConfirmationStatus: "CONTACT_CONFIRMED",
      origin: "RECIPIENT_INVITATION",
    });
    const recovered = await confirmRecipientDestination(connection.db, {
      sessionTokenHash: sessionHash,
      receiver,
      receiverFingerprint,
      network: "regtest",
      idempotencyKeyHash,
      requestHash,
    });
    expect(recovered).toMatchObject({ recovered: true });
    expect(recovered.destination.id).toBe(first.destination.id);
    await expect(
      confirmRecipientDestination(connection.db, {
        sessionTokenHash: sessionHash,
        receiver: `uregtest1${"c".repeat(90)}`,
        receiverFingerprint: digest("different"),
        network: "regtest",
        idempotencyKeyHash,
        requestHash: digest("different-request"),
      }),
    ).rejects.toMatchObject<Partial<RecipientWorkflowError>>({
      code: "IDEMPOTENCY_CONFLICT",
    });

    const [updatedObligation] = await connection.db
      .select()
      .from(schema.obligations)
      .where(eq(schema.obligations.id, obligationId));
    expect(updatedObligation).toMatchObject({
      state: "UNDER_REVIEW",
      destinationId: null,
    });
    const [approval] = await connection.db
      .select()
      .from(schema.approvals)
      .where(eq(schema.approvals.obligationId, obligationId));
    expect(approval?.invalidatedAt).toBeInstanceOf(Date);
    const [intent] = await connection.db
      .select()
      .from(schema.settlementIntents)
      .where(eq(schema.settlementIntents.obligationId, obligationId));
    expect(intent).toMatchObject({ state: "INVALIDATED" });
    await expect(
      verifyDestinationManually(
        connection.db,
        actor,
        first.destination.id,
        "Email follow-up",
        "Issuer attempting self-review",
      ),
    ).rejects.toThrow("independent reviewer");
    expect(
      await verifyDestinationManually(
        connection.db,
        reviewer,
        first.destination.id,
        "Independent call",
        "Treasury confirmed destination out of band",
      ),
    ).toMatchObject({ verificationStatus: "VERIFIED_MANUALLY" });
    expect(await verifyAuditChain(connection.db, organizationA)).toMatchObject({
      valid: true,
    });
    const stored = JSON.stringify(
      await connection.db
        .select()
        .from(schema.recipientInvitations)
        .where(eq(schema.recipientInvitations.id, invitation.id)),
    );
    expect(stored).not.toContain("invitation-token");
    expect(stored).not.toContain("payables-recipient@example.test");
  });

  it("fails expired and invalid verification without creating a session", async () => {
    const { invitation } = await createRecipientInvitation(
      connection.db,
      actor,
      {
        obligationId,
        tokenHash: digest("expired-invitation"),
        contactPepper: "q".repeat(32),
        network: "regtest",
        now: new Date("2026-01-01T00:00:00Z"),
      },
    );
    await expect(
      createRecipientChallenge(connection.db, {
        invitationId: invitation.id,
        organizationId: organizationA,
        challengeId: randomUUID(),
        codeHash: digest("never-used"),
        now: new Date("2026-01-03T00:00:00Z"),
      }),
    ).rejects.toMatchObject<Partial<RecipientWorkflowError>>({
      code: "UNAVAILABLE",
    });
    expect(
      await expireRecipientInvitations(
        connection.db,
        new Date("2026-01-03T00:00:00Z"),
      ),
    ).toBe(1);
    const [expired] = await connection.db
      .select()
      .from(schema.recipientInvitations)
      .where(eq(schema.recipientInvitations.id, invitation.id));
    expect(expired?.state).toBe("EXPIRED");
    const sessions = await connection.db
      .select()
      .from(schema.recipientSessions)
      .where(eq(schema.recipientSessions.invitationId, invitation.id));
    expect(sessions).toEqual([]);
  });

  it("bounds receipt recovery to unexpired, unrevoked and current state", async () => {
    const { invitation, session, confirmation } =
      await createVerifiedRecipientSession("bounded-recovery");
    const first = await confirmRecipientDestination(
      connection.db,
      confirmation,
    );
    const destinationCountAfterFirst = (
      await connection.db
        .select()
        .from(schema.vendorDestinations)
        .where(eq(schema.vendorDestinations.vendorId, vendorId))
    ).length;
    const confirmationAuditCountAfterFirst = (
      await connection.db
        .select()
        .from(schema.auditEvents)
        .where(
          and(
            eq(schema.auditEvents.organizationId, organizationA),
            eq(schema.auditEvents.eventType, "RECIPIENT_DESTINATION_CONFIRMED"),
          ),
        )
    ).length;
    expect(
      await confirmRecipientDestination(connection.db, confirmation),
    ).toMatchObject({ recovered: true });
    expect(
      (
        await connection.db
          .select()
          .from(schema.vendorDestinations)
          .where(eq(schema.vendorDestinations.vendorId, vendorId))
      ).length,
    ).toBe(destinationCountAfterFirst);
    expect(
      (
        await connection.db
          .select()
          .from(schema.auditEvents)
          .where(
            and(
              eq(schema.auditEvents.organizationId, organizationA),
              eq(
                schema.auditEvents.eventType,
                "RECIPIENT_DESTINATION_CONFIRMED",
              ),
            ),
          )
      ).length,
    ).toBe(confirmationAuditCountAfterFirst);
    await expect(
      confirmRecipientDestination(connection.db, {
        ...confirmation,
        requestHash: digest("bounded-recovery-conflict"),
      }),
    ).rejects.toMatchObject<Partial<RecipientWorkflowError>>({
      code: "IDEMPOTENCY_CONFLICT",
    });

    await connection.db
      .update(schema.recipientInvitations)
      .set({ state: "REVOKED", revokedAt: new Date() })
      .where(eq(schema.recipientInvitations.id, invitation.id));
    await expect(
      confirmRecipientDestination(connection.db, confirmation),
    ).rejects.toMatchObject<Partial<RecipientWorkflowError>>({
      code: "UNAVAILABLE",
    });
    await connection.db
      .update(schema.recipientInvitations)
      .set({ state: "CONSUMED", revokedAt: null })
      .where(eq(schema.recipientInvitations.id, invitation.id));

    await connection.db
      .update(schema.recipientSessions)
      .set({ expiresAt: new Date(Date.now() - 1) })
      .where(eq(schema.recipientSessions.id, session.id));
    await expect(
      confirmRecipientDestination(connection.db, confirmation),
    ).rejects.toMatchObject<Partial<RecipientWorkflowError>>({
      code: "UNAVAILABLE",
    });
    await connection.db
      .update(schema.recipientSessions)
      .set({ expiresAt: session.expiresAt })
      .where(eq(schema.recipientSessions.id, session.id));

    await connection.db
      .update(schema.recipientInvitations)
      .set({ expiresAt: new Date(Date.now() - 1) })
      .where(eq(schema.recipientInvitations.id, invitation.id));
    await expect(
      confirmRecipientDestination(connection.db, confirmation),
    ).rejects.toMatchObject<Partial<RecipientWorkflowError>>({
      code: "UNAVAILABLE",
    });
    await connection.db
      .update(schema.recipientInvitations)
      .set({ expiresAt: invitation.expiresAt })
      .where(eq(schema.recipientInvitations.id, invitation.id));

    await addVendorDestination(connection.db, actor, vendorId, {
      network: "ZCASH",
      receiver: `uregtest1${"e".repeat(90)}`,
    });
    await expect(
      confirmRecipientDestination(connection.db, confirmation),
    ).rejects.toMatchObject<Partial<RecipientWorkflowError>>({ code: "STALE" });
    const [supersededResult] = await connection.db
      .select()
      .from(schema.vendorDestinations)
      .where(eq(schema.vendorDestinations.id, first.destination.id));
    expect(supersededResult?.supersededAt).toBeInstanceOf(Date);
  });

  it("rejects concurrent replacement while a signed transaction is pending", async () => {
    const fixture = await createSettlementFixture(
      "SIGNED-GUARD",
      "SIGNING",
      "SIGNED",
    );
    const { invitation, confirmation } = await createVerifiedRecipientSession(
      "signed-guard",
      fixture.obligation.id,
    );
    await expect(
      addVendorDestination(connection.db, actor, vendorId, {
        network: "ZCASH",
        receiver: `uregtest1${"f".repeat(90)}`,
      }),
    ).rejects.toThrow("signed transaction awaits broadcast");
    const outcomes = await Promise.allSettled([
      confirmRecipientDestination(connection.db, confirmation),
      confirmRecipientDestination(connection.db, {
        ...confirmation,
        idempotencyKeyHash: digest("signed-guard-second-key"),
        requestHash: digest("signed-guard-second-request"),
      }),
    ]);
    expect(outcomes.every((outcome) => outcome.status === "rejected")).toBe(
      true,
    );
    for (const outcome of outcomes)
      if (outcome.status === "rejected")
        expect(outcome.reason).toMatchObject({ code: "STALE" });
    const [obligation] = await connection.db
      .select()
      .from(schema.obligations)
      .where(eq(schema.obligations.id, fixture.obligation.id));
    const [intent] = await connection.db
      .select()
      .from(schema.settlementIntents)
      .where(eq(schema.settlementIntents.id, fixture.intent.id));
    const [settlement] = await connection.db
      .select()
      .from(schema.settlements)
      .where(eq(schema.settlements.id, fixture.settlement.id));
    const currentDestinations = await connection.db
      .select()
      .from(schema.vendorDestinations)
      .where(
        and(
          eq(schema.vendorDestinations.organizationId, organizationA),
          eq(schema.vendorDestinations.vendorId, vendorId),
          isNull(schema.vendorDestinations.supersededAt),
        ),
      );
    expect(obligation?.state).toBe("SIGNING");
    expect(intent).toMatchObject({ state: "SIGNED", invalidatedAt: null });
    expect(settlement).toMatchObject({ state: "SIGNED" });
    expect(currentDestinations).toHaveLength(1);
    expect(currentDestinations[0]?.id).toBe(fixture.destination.id);

    await connection.db
      .delete(schema.recipientSessions)
      .where(eq(schema.recipientSessions.invitationId, invitation.id));
    await connection.db
      .delete(schema.recipientVerificationChallenges)
      .where(
        eq(schema.recipientVerificationChallenges.invitationId, invitation.id),
      );
    await connection.db
      .delete(schema.recipientInvitations)
      .where(eq(schema.recipientInvitations.id, invitation.id));
    await connection.db
      .delete(schema.settlements)
      .where(eq(schema.settlements.id, fixture.settlement.id));
    await connection.db
      .delete(schema.settlementIntents)
      .where(eq(schema.settlementIntents.id, fixture.intent.id));
    await connection.db
      .delete(schema.settlementQuotes)
      .where(eq(schema.settlementQuotes.id, fixture.quote.id));
    await connection.db
      .delete(schema.policyDecisions)
      .where(eq(schema.policyDecisions.id, fixture.decision.id));
    await connection.db
      .delete(schema.obligations)
      .where(eq(schema.obligations.id, fixture.obligation.id));
  });

  it("invalidates unsigned work across a vendor without erasing broadcast reconciliation", async () => {
    const unsigned = await createSettlementFixture(
      "UNSIGNED-SHARED",
      "SIGNING",
      "AWAITING_SIGNATURE",
    );
    const broadcast = await createSettlementFixture(
      "BROADCAST-SHARED",
      "BROADCAST",
      "BROADCAST",
    );
    const [target] = await connection.db
      .insert(schema.settlementObservationTargets)
      .values({
        organizationId: organizationA,
        obligationId: broadcast.obligation.id,
        settlementId: broadcast.settlement.id,
        intentId: broadcast.intent.id,
        network: "regtest",
        receiverFingerprint: broadcast.destination.fingerprint,
        memoReferenceHash: broadcast.intent.memoReferenceHash,
        expectedAmountZat: broadcast.intent.zatoshiAmount,
        requiredConfirmations: 2,
      })
      .returning();
    const { confirmation } = await createVerifiedRecipientSession(
      "shared-destination",
      unsigned.obligation.id,
    );
    await expect(
      confirmRecipientDestination(connection.db, confirmation),
    ).resolves.toMatchObject({ recovered: false });

    const [invalidatedObligation] = await connection.db
      .select()
      .from(schema.obligations)
      .where(eq(schema.obligations.id, unsigned.obligation.id));
    const [invalidatedIntent] = await connection.db
      .select()
      .from(schema.settlementIntents)
      .where(eq(schema.settlementIntents.id, unsigned.intent.id));
    const [invalidatedSettlement] = await connection.db
      .select()
      .from(schema.settlements)
      .where(eq(schema.settlements.id, unsigned.settlement.id));
    expect(invalidatedObligation).toMatchObject({
      state: "UNDER_REVIEW",
      destinationId: null,
    });
    expect(invalidatedIntent?.state).toBe("INVALIDATED");
    expect(invalidatedSettlement?.state).toBe("INVALIDATED");

    const [broadcastObligation] = await connection.db
      .select()
      .from(schema.obligations)
      .where(eq(schema.obligations.id, broadcast.obligation.id));
    const [broadcastIntent] = await connection.db
      .select()
      .from(schema.settlementIntents)
      .where(eq(schema.settlementIntents.id, broadcast.intent.id));
    const [broadcastSettlement] = await connection.db
      .select()
      .from(schema.settlements)
      .where(eq(schema.settlements.id, broadcast.settlement.id));
    const [preservedTarget] = await connection.db
      .select()
      .from(schema.settlementObservationTargets)
      .where(eq(schema.settlementObservationTargets.id, target!.id));
    expect(broadcastObligation?.state).toBe("BROADCAST");
    expect(broadcastIntent).toMatchObject({
      state: "BROADCAST",
      invalidatedAt: null,
    });
    expect(broadcastSettlement?.state).toBe("BROADCAST");
    expect(preservedTarget).toMatchObject({
      settlementId: broadcast.settlement.id,
      intentId: broadcast.intent.id,
    });
    const observed = await ingestShieldedObservation(connection.db, actor, {
      network: "regtest",
      txid: broadcast.settlement.txRefPrivate!,
      outputIndex: 0,
      pool: "IRONWOOD",
      amountZat: broadcast.intent.zatoshiAmount,
      minedHeight: 100,
      confirmations: 2,
      receiverFingerprint: broadcast.destination.fingerprint,
      memoReference: "BROADCAST-SHARED-memo",
      observedAt: new Date(),
      observerSource: "private-payables-security-test",
    });
    expect(observed).toMatchObject({
      outcome: "STORED",
      observation: { state: "SETTLED" },
    });
    const [reconciledObligation] = await connection.db
      .select()
      .from(schema.obligations)
      .where(eq(schema.obligations.id, broadcast.obligation.id));
    const [reconciledSettlement] = await connection.db
      .select()
      .from(schema.settlements)
      .where(eq(schema.settlements.id, broadcast.settlement.id));
    expect(reconciledObligation?.state).toBe("SETTLED");
    expect(reconciledSettlement?.state).toBe("SETTLED");
  });

  it("refuses challenge delivery after the bound contact changes", async () => {
    const pepper = "c".repeat(32);
    const tokenHash = digest("contact-change-invitation");
    await createRecipientInvitation(connection.db, actor, {
      obligationId,
      tokenHash,
      contactPepper: pepper,
      network: "regtest",
    });
    await connection.db
      .update(schema.vendors)
      .set({ contactEmail: "changed-recipient@example.test" })
      .where(
        and(
          eq(schema.vendors.organizationId, organizationA),
          eq(schema.vendors.id, vendorId),
        ),
      );
    expect(
      await getRecipientChallengeContext(connection.db, tokenHash, pepper),
    ).toBeNull();
    await connection.db
      .update(schema.vendors)
      .set({ contactEmail: "payables-recipient@example.test" })
      .where(
        and(
          eq(schema.vendors.organizationId, organizationA),
          eq(schema.vendors.id, vendorId),
        ),
      );
  });

  it("allows exactly one of two concurrent one-time confirmations", async () => {
    const tokenHash = digest("concurrent-invitation");
    const { invitation } = await createRecipientInvitation(
      connection.db,
      actor,
      {
        obligationId,
        tokenHash,
        contactPepper: "r".repeat(32),
        network: "regtest",
      },
    );
    const challengeId = randomUUID();
    const codeHash = digest("concurrent-code");
    await createRecipientChallenge(connection.db, {
      invitationId: invitation.id,
      organizationId: organizationA,
      challengeId,
      codeHash,
    });
    const context = await getRecipientVerificationContext(
      connection.db,
      tokenHash,
    );
    const sessionHash = digest("concurrent-session");
    await verifyRecipientContact(connection.db, {
      ...context!,
      codeHash,
      sessionId: randomUUID(),
      sessionTokenHash: sessionHash,
    });
    const receiver = `uregtest1${"d".repeat(90)}`;
    const common = {
      sessionTokenHash: sessionHash,
      receiver,
      receiverFingerprint: digest(receiver),
      network: "regtest",
    };
    const recipientDestinationsBefore = await connection.db
      .select()
      .from(schema.vendorDestinations)
      .where(
        and(
          eq(schema.vendorDestinations.organizationId, organizationA),
          eq(schema.vendorDestinations.vendorId, vendorId),
          eq(schema.vendorDestinations.origin, "RECIPIENT_INVITATION"),
        ),
      );
    const outcomes = await Promise.allSettled([
      confirmRecipientDestination(connection.db, {
        ...common,
        idempotencyKeyHash: digest("race-a"),
        requestHash: digest("race-request-a"),
      }),
      confirmRecipientDestination(connection.db, {
        ...common,
        idempotencyKeyHash: digest("race-b"),
        requestHash: digest("race-request-b"),
      }),
    ]);
    expect(
      outcomes.filter((outcome) => outcome.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      outcomes.filter((outcome) => outcome.status === "rejected"),
    ).toHaveLength(1);
    const recipientDestinations = await connection.db
      .select()
      .from(schema.vendorDestinations)
      .where(
        and(
          eq(schema.vendorDestinations.organizationId, organizationA),
          eq(schema.vendorDestinations.vendorId, vendorId),
          eq(schema.vendorDestinations.origin, "RECIPIENT_INVITATION"),
        ),
      );
    expect(recipientDestinations).toHaveLength(
      recipientDestinationsBefore.length + 1,
    );
    expect(
      recipientDestinations.filter(
        (destination) => destination.supersededAt === null,
      ),
    ).toHaveLength(1);
    expect(await verifyAuditChain(connection.db, organizationA)).toMatchObject({
      valid: true,
    });
  });

  it("persists the bounded verification-attempt lockout", async () => {
    const tokenHash = digest("attempt-invitation");
    const { invitation } = await createRecipientInvitation(
      connection.db,
      actor,
      {
        obligationId,
        tokenHash,
        contactPepper: "s".repeat(32),
        network: "regtest",
      },
    );
    const challengeId = randomUUID();
    await createRecipientChallenge(connection.db, {
      invitationId: invitation.id,
      organizationId: organizationA,
      challengeId,
      codeHash: digest("correct-code"),
    });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        verifyRecipientContact(connection.db, {
          invitationId: invitation.id,
          organizationId: organizationA,
          challengeId,
          codeHash: digest(`wrong-${attempt}`),
          sessionId: randomUUID(),
          sessionTokenHash: digest(`unused-session-${attempt}`),
        }),
      ).rejects.toBeInstanceOf(Error);
    }
    const [challenge] = await connection.db
      .select()
      .from(schema.recipientVerificationChallenges)
      .where(eq(schema.recipientVerificationChallenges.id, challengeId));
    expect(challenge).toMatchObject({
      state: "LOCKED_OUT",
      attemptCount: 5,
      maxAttempts: 5,
    });
    expect(
      await connection.db
        .select()
        .from(schema.recipientSessions)
        .where(eq(schema.recipientSessions.invitationId, invitation.id)),
    ).toEqual([]);
  });
});
