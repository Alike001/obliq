import {
  recipientChallengeTtlMs,
  recipientInvitationPurpose,
  recipientInvitationTtlMs,
  recipientSessionTtlMs,
  type RecipientInvitationRevocationReason,
} from "@obliq/domain";
import { hashRecipientSecret } from "@obliq/security";
import { timingSafeEqual } from "node:crypto";
import { and, eq, gt, inArray, lte, ne, sql } from "drizzle-orm";
import type { createDatabase } from "../index";
import {
  approvalRequirements,
  approvals,
  destinationAttestations,
  memberships,
  obligations,
  recipientInvitations,
  recipientOperationReceipts,
  recipientSessions,
  recipientVerificationChallenges,
  settlementIntents,
  settlements,
  vendorDestinations,
  vendors,
} from "../schema";
import { appendAuditEvent, type AuditActor, type TenantActor } from "./index";

type Database = ReturnType<typeof createDatabase>["db"];
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type MembershipRole = (typeof memberships.role.enumValues)[number];
const invitationAdministrators: readonly MembershipRole[] = [
  "OWNER",
  "CFO",
  "FINANCE",
];
const terminalObligationStates = [
  "SETTLED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
] as const;

function secretHashesMatch(expected: string, submitted: string) {
  const expectedBytes = Buffer.from(expected, "hex");
  const submittedBytes = Buffer.from(submitted, "hex");
  return (
    expectedBytes.length > 0 &&
    expectedBytes.length === submittedBytes.length &&
    timingSafeEqual(expectedBytes, submittedBytes)
  );
}

export class RecipientWorkflowError extends Error {
  constructor(
    readonly code:
      | "UNAVAILABLE"
      | "EXPIRED"
      | "STALE"
      | "IDEMPOTENCY_CONFLICT"
      | "ATTEMPTS_EXHAUSTED",
  ) {
    super("Recipient workflow is unavailable");
    this.name = "RecipientWorkflowError";
  }
}

async function lockOrganization(tx: Transaction, organizationId: string) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${organizationId}))`,
  );
}

async function requireInvitationAdministrator(
  tx: Database | Transaction,
  actor: TenantActor,
) {
  const [membership] = await tx
    .select({ role: memberships.role })
    .from(memberships)
    .where(
      and(
        eq(memberships.organizationId, actor.organizationId),
        eq(memberships.userId, actor.userId),
        eq(memberships.status, "ACTIVE"),
      ),
    )
    .limit(1);
  if (!membership || !invitationAdministrators.includes(membership.role))
    throw new Error("Actor cannot administer recipient invitations");
}

export async function createRecipientInvitation(
  db: Database,
  actor: TenantActor,
  input: {
    obligationId: string;
    tokenHash: string;
    contactPepper: string;
    network: string;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    await lockOrganization(tx, actor.organizationId);
    await requireInvitationAdministrator(tx, actor);
    const [record] = await tx
      .select({
        obligation: obligations,
        vendor: vendors,
        destination: vendorDestinations,
      })
      .from(obligations)
      .innerJoin(
        vendors,
        and(
          eq(vendors.organizationId, actor.organizationId),
          eq(vendors.id, obligations.vendorId),
        ),
      )
      .leftJoin(
        vendorDestinations,
        and(
          eq(vendorDestinations.organizationId, actor.organizationId),
          eq(vendorDestinations.vendorId, obligations.vendorId),
          sql`${vendorDestinations.supersededAt} is null`,
        ),
      )
      .where(
        and(
          eq(obligations.organizationId, actor.organizationId),
          eq(obligations.id, input.obligationId),
        ),
      )
      .limit(1);
    if (
      !record ||
      !record.vendor.contactEmail ||
      terminalObligationStates.includes(
        record.obligation.state as (typeof terminalObligationStates)[number],
      )
    )
      throw new RecipientWorkflowError("UNAVAILABLE");

    const replaced = await tx
      .update(recipientInvitations)
      .set({
        state: "SUPERSEDED",
        revokedAt: now,
        revokedBy: actor.userId,
        reasonCode: "REPLACED",
      })
      .where(
        and(
          eq(recipientInvitations.organizationId, actor.organizationId),
          eq(recipientInvitations.vendorId, record.vendor.id),
          eq(recipientInvitations.purpose, recipientInvitationPurpose),
          inArray(recipientInvitations.state, ["ACTIVE", "CONTACT_VERIFIED"]),
        ),
      )
      .returning({ id: recipientInvitations.id });
    for (const prior of replaced) {
      await tx
        .update(recipientVerificationChallenges)
        .set({ state: "REVOKED" })
        .where(eq(recipientVerificationChallenges.invitationId, prior.id));
      await tx
        .update(recipientSessions)
        .set({ state: "REVOKED", revokedAt: now })
        .where(eq(recipientSessions.invitationId, prior.id));
      await appendAuditEvent(tx, actor, {
        eventType: "RECIPIENT_INVITATION_SUPERSEDED",
        subjectType: "RECIPIENT_INVITATION",
        subjectId: prior.id,
        payload: { reasonCode: "REPLACED" },
      });
    }

    const [invitation] = await tx
      .insert(recipientInvitations)
      .values({
        organizationId: actor.organizationId,
        vendorId: record.vendor.id,
        obligationId: record.obligation.id,
        obligationVersion: record.obligation.version,
        baseDestinationId: record.destination?.id,
        baseDestinationVersion: record.destination?.version,
        purpose: recipientInvitationPurpose,
        network: input.network,
        contactChannel: "EMAIL",
        contactFingerprint: hashRecipientSecret(
          "contact",
          record.vendor.contactEmail.trim().toLowerCase(),
          input.contactPepper,
        ),
        tokenHash: input.tokenHash,
        expiresAt: new Date(now.getTime() + recipientInvitationTtlMs),
        createdBy: actor.userId,
      })
      .returning();
    if (!invitation) throw new Error("Invitation insert failed");
    await appendAuditEvent(tx, actor, {
      eventType: "RECIPIENT_INVITATION_CREATED",
      subjectType: "RECIPIENT_INVITATION",
      subjectId: invitation.id,
      payload: {
        obligationId: invitation.obligationId,
        obligationVersion: invitation.obligationVersion,
        contactFingerprint: invitation.contactFingerprint,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    });
    return { invitation, deliveryEmail: record.vendor.contactEmail };
  });
}

export async function revokeRecipientInvitation(
  db: Database,
  actor: TenantActor,
  invitationId: string,
  reasonCode: RecipientInvitationRevocationReason | "DELIVERY_FAILED",
  now = new Date(),
) {
  return db.transaction(async (tx) => {
    await lockOrganization(tx, actor.organizationId);
    await requireInvitationAdministrator(tx, actor);
    const [invitation] = await tx
      .update(recipientInvitations)
      .set({
        state: "REVOKED",
        revokedAt: now,
        revokedBy: actor.userId,
        reasonCode,
      })
      .where(
        and(
          eq(recipientInvitations.organizationId, actor.organizationId),
          eq(recipientInvitations.id, invitationId),
          inArray(recipientInvitations.state, ["ACTIVE", "CONTACT_VERIFIED"]),
        ),
      )
      .returning();
    if (!invitation) return null;
    await tx
      .update(recipientVerificationChallenges)
      .set({ state: "REVOKED" })
      .where(eq(recipientVerificationChallenges.invitationId, invitation.id));
    await tx
      .update(recipientSessions)
      .set({ state: "REVOKED", revokedAt: now })
      .where(eq(recipientSessions.invitationId, invitation.id));
    await appendAuditEvent(tx, actor, {
      eventType: "RECIPIENT_INVITATION_REVOKED",
      subjectType: "RECIPIENT_INVITATION",
      subjectId: invitation.id,
      payload: { reasonCode: invitation.reasonCode },
    });
    return invitation;
  });
}

export async function expireRecipientInvitations(
  db: Database,
  now = new Date(),
  limit = 100,
) {
  const candidates = await db
    .select({
      id: recipientInvitations.id,
      organizationId: recipientInvitations.organizationId,
    })
    .from(recipientInvitations)
    .where(
      and(
        inArray(recipientInvitations.state, ["ACTIVE", "CONTACT_VERIFIED"]),
        lte(recipientInvitations.expiresAt, now),
      ),
    )
    .limit(Math.max(1, Math.min(limit, 500)));
  let expired = 0;
  for (const candidate of candidates) {
    expired += await db.transaction(async (tx) => {
      await lockOrganization(tx, candidate.organizationId);
      const [invitation] = await tx
        .update(recipientInvitations)
        .set({ state: "EXPIRED", revokedAt: now, reasonCode: "EXPIRED" })
        .where(
          and(
            eq(recipientInvitations.id, candidate.id),
            eq(recipientInvitations.organizationId, candidate.organizationId),
            inArray(recipientInvitations.state, ["ACTIVE", "CONTACT_VERIFIED"]),
            lte(recipientInvitations.expiresAt, now),
          ),
        )
        .returning();
      if (!invitation) return 0;
      await tx
        .update(recipientVerificationChallenges)
        .set({ state: "EXPIRED" })
        .where(
          and(
            eq(recipientVerificationChallenges.invitationId, invitation.id),
            eq(recipientVerificationChallenges.state, "ACTIVE"),
          ),
        );
      await tx
        .update(recipientSessions)
        .set({ state: "EXPIRED", revokedAt: now })
        .where(
          and(
            eq(recipientSessions.invitationId, invitation.id),
            eq(recipientSessions.state, "ACTIVE"),
          ),
        );
      await appendAuditEvent(
        tx,
        { organizationId: invitation.organizationId, actorType: "SYSTEM" },
        {
          eventType: "RECIPIENT_INVITATION_EXPIRED",
          subjectType: "RECIPIENT_INVITATION",
          subjectId: invitation.id,
          payload: { reasonCode: "EXPIRED" },
        },
      );
      return 1;
    });
  }
  return expired;
}

export async function getRecipientChallengeContext(
  db: Database,
  tokenHash: string,
  contactPepper: string,
  now = new Date(),
) {
  const [result] = await db
    .select({
      invitation: recipientInvitations,
      deliveryEmail: vendors.contactEmail,
    })
    .from(recipientInvitations)
    .innerJoin(
      vendors,
      and(
        eq(vendors.organizationId, recipientInvitations.organizationId),
        eq(vendors.id, recipientInvitations.vendorId),
      ),
    )
    .where(
      and(
        eq(recipientInvitations.tokenHash, tokenHash),
        eq(recipientInvitations.state, "ACTIVE"),
        gt(recipientInvitations.expiresAt, now),
      ),
    )
    .limit(1);
  if (!result?.deliveryEmail) return null;
  const currentContactFingerprint = hashRecipientSecret(
    "contact",
    result.deliveryEmail.trim().toLowerCase(),
    contactPepper,
  );
  return secretHashesMatch(
    result.invitation.contactFingerprint,
    currentContactFingerprint,
  )
    ? result
    : null;
}

export async function createRecipientChallenge(
  db: Database,
  input: {
    invitationId: string;
    organizationId: string;
    challengeId: string;
    codeHash: string;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    await lockOrganization(tx, input.organizationId);
    const [invitation] = await tx
      .select()
      .from(recipientInvitations)
      .where(
        and(
          eq(recipientInvitations.id, input.invitationId),
          eq(recipientInvitations.organizationId, input.organizationId),
          eq(recipientInvitations.state, "ACTIVE"),
          gt(recipientInvitations.expiresAt, now),
        ),
      )
      .for("update")
      .limit(1);
    if (!invitation) throw new RecipientWorkflowError("UNAVAILABLE");
    await tx
      .update(recipientVerificationChallenges)
      .set({ state: "REVOKED" })
      .where(
        and(
          eq(recipientVerificationChallenges.invitationId, invitation.id),
          eq(recipientVerificationChallenges.state, "ACTIVE"),
        ),
      );
    const [challenge] = await tx
      .insert(recipientVerificationChallenges)
      .values({
        id: input.challengeId,
        organizationId: invitation.organizationId,
        invitationId: invitation.id,
        codeHash: input.codeHash,
        expiresAt: new Date(now.getTime() + recipientChallengeTtlMs),
        maxAttempts: 5,
      })
      .returning();
    if (!challenge) throw new Error("Challenge insert failed");
    return challenge;
  });
}

export async function getRecipientVerificationContext(
  db: Database,
  tokenHash: string,
  now = new Date(),
) {
  const [result] = await db
    .select({
      invitationId: recipientInvitations.id,
      organizationId: recipientInvitations.organizationId,
      challengeId: recipientVerificationChallenges.id,
    })
    .from(recipientInvitations)
    .innerJoin(
      recipientVerificationChallenges,
      and(
        eq(
          recipientVerificationChallenges.invitationId,
          recipientInvitations.id,
        ),
        eq(recipientVerificationChallenges.state, "ACTIVE"),
      ),
    )
    .where(
      and(
        eq(recipientInvitations.tokenHash, tokenHash),
        eq(recipientInvitations.state, "ACTIVE"),
        gt(recipientInvitations.expiresAt, now),
        gt(recipientVerificationChallenges.expiresAt, now),
      ),
    )
    .limit(1);
  return result ?? null;
}

export async function verifyRecipientContact(
  db: Database,
  input: {
    invitationId: string;
    organizationId: string;
    challengeId: string;
    codeHash: string;
    sessionId: string;
    sessionTokenHash: string;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  const outcome = await db.transaction(async (tx) => {
    await lockOrganization(tx, input.organizationId);
    const [invitation] = await tx
      .select()
      .from(recipientInvitations)
      .where(
        and(
          eq(recipientInvitations.id, input.invitationId),
          eq(recipientInvitations.organizationId, input.organizationId),
        ),
      )
      .for("update")
      .limit(1);
    const [challenge] = await tx
      .select()
      .from(recipientVerificationChallenges)
      .where(
        and(
          eq(recipientVerificationChallenges.id, input.challengeId),
          eq(recipientVerificationChallenges.invitationId, input.invitationId),
        ),
      )
      .for("update")
      .limit(1);
    if (
      !invitation ||
      !challenge ||
      invitation.state !== "ACTIVE" ||
      invitation.expiresAt <= now ||
      challenge.state !== "ACTIVE" ||
      challenge.expiresAt <= now
    )
      throw new RecipientWorkflowError("UNAVAILABLE");
    if (!secretHashesMatch(challenge.codeHash, input.codeHash)) {
      const attempts = challenge.attemptCount + 1;
      await tx
        .update(recipientVerificationChallenges)
        .set({
          attemptCount: attempts,
          state: attempts >= challenge.maxAttempts ? "LOCKED_OUT" : "ACTIVE",
        })
        .where(eq(recipientVerificationChallenges.id, challenge.id));
      return {
        failure:
          attempts >= challenge.maxAttempts
            ? ("ATTEMPTS_EXHAUSTED" as const)
            : ("UNAVAILABLE" as const),
      };
    }
    await tx
      .update(recipientVerificationChallenges)
      .set({ state: "CONSUMED", consumedAt: now })
      .where(eq(recipientVerificationChallenges.id, challenge.id));
    await tx
      .update(recipientInvitations)
      .set({ state: "CONTACT_VERIFIED" })
      .where(eq(recipientInvitations.id, invitation.id));
    const [session] = await tx
      .insert(recipientSessions)
      .values({
        id: input.sessionId,
        organizationId: invitation.organizationId,
        invitationId: invitation.id,
        tokenHash: input.sessionTokenHash,
        contactVerifiedAt: now,
        expiresAt: new Date(now.getTime() + recipientSessionTtlMs),
        lastSeenAt: now,
      })
      .returning();
    if (!session) throw new Error("Recipient session insert failed");
    await appendAuditEvent(
      tx,
      {
        organizationId: invitation.organizationId,
        actorType: "RECIPIENT_SESSION",
        sessionId: session.id,
      },
      {
        eventType: "RECIPIENT_CONTACT_VERIFIED",
        subjectType: "RECIPIENT_INVITATION",
        subjectId: invitation.id,
        payload: {
          method: "EMAIL_CODE",
          contactFingerprint: invitation.contactFingerprint,
        },
      },
    );
    return { session };
  });
  if ("failure" in outcome) throw new RecipientWorkflowError(outcome.failure);
  return outcome.session;
}

export async function getRecipientSessionSummary(
  db: Database,
  sessionTokenHash: string,
  now = new Date(),
) {
  const [result] = await db
    .select({
      invitationId: recipientInvitations.id,
      obligationId: obligations.id,
      obligationVersion: recipientInvitations.obligationVersion,
      reference: obligations.reference,
      amountMinor: obligations.amountMinor,
      currency: obligations.currency,
      dueAt: obligations.dueAt,
      network: recipientInvitations.network,
      expiresAt: recipientSessions.expiresAt,
    })
    .from(recipientSessions)
    .innerJoin(
      recipientInvitations,
      and(
        eq(
          recipientInvitations.organizationId,
          recipientSessions.organizationId,
        ),
        eq(recipientInvitations.id, recipientSessions.invitationId),
      ),
    )
    .innerJoin(
      obligations,
      and(
        eq(obligations.organizationId, recipientSessions.organizationId),
        eq(obligations.id, recipientInvitations.obligationId),
      ),
    )
    .where(
      and(
        eq(recipientSessions.tokenHash, sessionTokenHash),
        inArray(recipientSessions.state, ["ACTIVE", "CONSUMED"]),
        gt(recipientSessions.expiresAt, now),
      ),
    )
    .limit(1);
  return result ?? null;
}

async function invalidateVendorAuthorization(
  tx: Transaction,
  actor: AuditActor,
  vendorId: string,
  now: Date,
) {
  const affected = await tx
    .select({ id: obligations.id })
    .from(obligations)
    .where(
      and(
        eq(obligations.organizationId, actor.organizationId),
        eq(obligations.vendorId, vendorId),
        sql`${obligations.state} in ('APPROVAL_REQUIRED','APPROVED','READY_TO_SETTLE','SETTLEMENT_PREPARED','SIGNING','BLOCKED')`,
      ),
    );
  for (const obligation of affected) {
    const changedApprovals = await tx
      .update(approvals)
      .set({
        invalidatedAt: now,
        invalidationReason: "Vendor destination changed",
      })
      .where(
        and(
          eq(approvals.organizationId, actor.organizationId),
          eq(approvals.obligationId, obligation.id),
          sql`${approvals.invalidatedAt} is null`,
        ),
      )
      .returning({ id: approvals.id });
    await tx
      .update(approvalRequirements)
      .set({ state: "INVALIDATED" })
      .where(
        and(
          eq(approvalRequirements.organizationId, actor.organizationId),
          eq(approvalRequirements.obligationId, obligation.id),
          ne(approvalRequirements.state, "INVALIDATED"),
        ),
      );
    const changedIntents = await tx
      .update(settlementIntents)
      .set({
        state: "INVALIDATED",
        invalidatedAt: now,
        invalidationReason: "Vendor destination changed",
      })
      .where(
        and(
          eq(settlementIntents.organizationId, actor.organizationId),
          eq(settlementIntents.obligationId, obligation.id),
          sql`${settlementIntents.invalidatedAt} is null`,
        ),
      )
      .returning({ id: settlementIntents.id });
    await tx
      .update(settlements)
      .set({ state: "INVALIDATED", errorCode: "DESTINATION_CHANGED" })
      .where(
        and(
          eq(settlements.organizationId, actor.organizationId),
          eq(settlements.obligationId, obligation.id),
          sql`${settlements.state} not in ('SETTLED','INVALIDATED')`,
        ),
      );
    await tx
      .update(obligations)
      .set({ state: "UNDER_REVIEW", destinationId: null, updatedAt: now })
      .where(
        and(
          eq(obligations.organizationId, actor.organizationId),
          eq(obligations.id, obligation.id),
        ),
      );
    for (const approval of changedApprovals)
      await appendAuditEvent(tx, actor, {
        eventType: "APPROVAL_INVALIDATED",
        subjectType: "APPROVAL",
        subjectId: approval.id,
        payload: {
          obligationId: obligation.id,
          reason: "Vendor destination changed",
        },
      });
    for (const intent of changedIntents)
      await appendAuditEvent(tx, actor, {
        eventType: "SETTLEMENT_INTENT_INVALIDATED",
        subjectType: "SETTLEMENT_INTENT",
        subjectId: intent.id,
        payload: {
          obligationId: obligation.id,
          reason: "Vendor destination changed",
        },
      });
    await appendAuditEvent(tx, actor, {
      eventType: "AUTHORIZATION_RESET",
      subjectType: "OBLIGATION",
      subjectId: obligation.id,
      payload: { reason: "Vendor destination changed" },
    });
  }
}

export async function confirmRecipientDestination(
  db: Database,
  input: {
    sessionTokenHash: string;
    receiver: string;
    receiverFingerprint: string;
    network: string;
    idempotencyKeyHash: string;
    requestHash: string;
    now?: Date;
  },
) {
  const now = input.now ?? new Date();
  return db.transaction(async (tx) => {
    const [sessionLookup] = await tx
      .select({ organizationId: recipientSessions.organizationId })
      .from(recipientSessions)
      .where(eq(recipientSessions.tokenHash, input.sessionTokenHash))
      .limit(1);
    if (!sessionLookup) throw new RecipientWorkflowError("UNAVAILABLE");
    await lockOrganization(tx, sessionLookup.organizationId);
    const [session] = await tx
      .select()
      .from(recipientSessions)
      .where(
        and(
          eq(recipientSessions.organizationId, sessionLookup.organizationId),
          eq(recipientSessions.tokenHash, input.sessionTokenHash),
        ),
      )
      .for("update")
      .limit(1);
    if (!session) throw new RecipientWorkflowError("UNAVAILABLE");
    const [invitation] = await tx
      .select()
      .from(recipientInvitations)
      .where(
        and(
          eq(recipientInvitations.organizationId, session.organizationId),
          eq(recipientInvitations.id, session.invitationId),
        ),
      )
      .for("update")
      .limit(1);
    if (!invitation) throw new RecipientWorkflowError("UNAVAILABLE");
    const [priorReceipt] = await tx
      .select()
      .from(recipientOperationReceipts)
      .where(
        and(
          eq(
            recipientOperationReceipts.organizationId,
            invitation.organizationId,
          ),
          eq(recipientOperationReceipts.invitationId, invitation.id),
          eq(recipientOperationReceipts.operationType, "CONFIRM_DESTINATION"),
          eq(
            recipientOperationReceipts.idempotencyKeyHash,
            input.idempotencyKeyHash,
          ),
        ),
      )
      .limit(1);
    if (priorReceipt) {
      if (
        priorReceipt.status !== "COMPLETED" ||
        !priorReceipt.completedAt ||
        !priorReceipt.resultDestinationId ||
        invitation.state !== "CONSUMED" ||
        session.state !== "CONSUMED" ||
        invitation.expiresAt <= now ||
        session.expiresAt <= now ||
        invitation.consumedDestinationId !== priorReceipt.resultDestinationId ||
        invitation.consumedRequestHash !== priorReceipt.requestHash
      )
        throw new RecipientWorkflowError("UNAVAILABLE");
      if (priorReceipt.requestHash !== input.requestHash)
        throw new RecipientWorkflowError("IDEMPOTENCY_CONFLICT");
      const [destination] = await tx
        .select()
        .from(vendorDestinations)
        .where(
          and(
            eq(vendorDestinations.organizationId, invitation.organizationId),
            eq(vendorDestinations.id, priorReceipt.resultDestinationId),
            sql`${vendorDestinations.supersededAt} is null`,
          ),
        )
        .limit(1);
      if (!destination) throw new RecipientWorkflowError("STALE");
      return { destination, recovered: true };
    }
    if (
      session.state !== "ACTIVE" ||
      session.expiresAt <= now ||
      invitation.state !== "CONTACT_VERIFIED" ||
      invitation.expiresAt <= now ||
      invitation.network !== input.network
    )
      throw new RecipientWorkflowError("EXPIRED");
    const [obligation] = await tx
      .select()
      .from(obligations)
      .where(
        and(
          eq(obligations.organizationId, invitation.organizationId),
          eq(obligations.id, invitation.obligationId),
          eq(obligations.vendorId, invitation.vendorId),
        ),
      )
      .for("update")
      .limit(1);
    if (!obligation || obligation.version !== invitation.obligationVersion)
      throw new RecipientWorkflowError("STALE");
    const [current] = await tx
      .select()
      .from(vendorDestinations)
      .where(
        and(
          eq(vendorDestinations.organizationId, invitation.organizationId),
          eq(vendorDestinations.vendorId, invitation.vendorId),
          sql`${vendorDestinations.supersededAt} is null`,
        ),
      )
      .for("update")
      .limit(1);
    if (
      (current?.id ?? null) !== invitation.baseDestinationId ||
      (current?.version ?? null) !== invitation.baseDestinationVersion
    )
      throw new RecipientWorkflowError("STALE");
    const [signedExecution] = await tx
      .select({ id: settlements.id })
      .from(settlements)
      .innerJoin(
        settlementIntents,
        and(
          eq(settlementIntents.organizationId, invitation.organizationId),
          eq(settlementIntents.id, settlements.intentId),
        ),
      )
      .where(
        and(
          eq(settlements.organizationId, invitation.organizationId),
          eq(settlements.state, "SIGNED"),
          eq(settlementIntents.vendorId, invitation.vendorId),
        ),
      )
      .limit(1);
    if (signedExecution) throw new RecipientWorkflowError("STALE");
    if (current)
      await tx
        .update(vendorDestinations)
        .set({ supersededAt: now, verificationStatus: "SUPERSEDED" })
        .where(eq(vendorDestinations.id, current.id));
    const [destination] = await tx
      .insert(vendorDestinations)
      .values({
        organizationId: invitation.organizationId,
        vendorId: invitation.vendorId,
        version: (current?.version ?? 0) + 1,
        supersedesDestinationId: current?.id,
        network: input.network,
        receiver: input.receiver,
        fingerprint: input.receiverFingerprint,
        verificationStatus: "UNVERIFIED",
        recipientConfirmationStatus: "CONTACT_CONFIRMED",
        origin: "RECIPIENT_INVITATION",
      })
      .returning();
    if (!destination) throw new Error("Destination insert failed");
    await tx.insert(destinationAttestations).values({
      organizationId: invitation.organizationId,
      destinationId: destination.id,
      invitationId: invitation.id,
      sessionId: session.id,
      attestationType: "RECIPIENT_CONTACT_CONFIRMED",
      contactFingerprint: invitation.contactFingerprint,
      verificationMethod: "EMAIL_CODE",
    });
    const actor: AuditActor = {
      organizationId: invitation.organizationId,
      actorType: "RECIPIENT_SESSION",
      sessionId: session.id,
    };
    await invalidateVendorAuthorization(tx, actor, invitation.vendorId, now);
    await tx
      .update(recipientInvitations)
      .set({
        state: "CONSUMED",
        consumedDestinationId: destination.id,
        consumedRequestHash: input.requestHash,
        consumedAt: now,
      })
      .where(eq(recipientInvitations.id, invitation.id));
    await tx
      .update(recipientSessions)
      .set({ state: "CONSUMED", consumedAt: now, lastSeenAt: now })
      .where(eq(recipientSessions.id, session.id));
    await tx.insert(recipientOperationReceipts).values({
      organizationId: invitation.organizationId,
      invitationId: invitation.id,
      operationType: "CONFIRM_DESTINATION",
      idempotencyKeyHash: input.idempotencyKeyHash,
      requestHash: input.requestHash,
      status: "COMPLETED",
      resultDestinationId: destination.id,
      completedAt: now,
    });
    await appendAuditEvent(tx, actor, {
      eventType: "RECIPIENT_DESTINATION_CONFIRMED",
      subjectType: "VENDOR_DESTINATION",
      subjectId: destination.id,
      payload: {
        invitationId: invitation.id,
        version: destination.version,
        fingerprint: destination.fingerprint,
        addressOwnershipProof: "UNAVAILABLE",
      },
    });
    await appendAuditEvent(tx, actor, {
      eventType: "VENDOR_DESTINATION_CHANGED",
      subjectType: "VENDOR_DESTINATION",
      subjectId: destination.id,
      payload: {
        vendorId: destination.vendorId,
        fingerprint: destination.fingerprint,
        verificationStatus: "UNVERIFIED",
      },
    });
    return { destination, recovered: false };
  });
}
