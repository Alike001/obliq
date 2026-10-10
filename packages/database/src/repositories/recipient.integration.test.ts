import { createHash, randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
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
    const sourceId = randomUUID();
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
    expect(recipientDestinations).toHaveLength(2);
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
