import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { defaultPolicyConfig } from "@obliq/policy";
import { createDatabase, schema } from "../index";
import {
  addVendorDestination,
  createDefaultPolicy,
  createObligation,
  createPolicyVersion,
  createVendor,
  decideApproval,
  evaluateObligationControls,
  evaluateSettlementReadiness,
  getControlView,
  getObligation,
  listPolicies,
  updateObligation,
  verifyAuditChain,
  verifyDestinationManually,
} from "./index";

const url = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const suite = url ? describe : describe.skip;
suite("Phase 2 control repositories", () => {
  const connection = createDatabase(url!);
  const organizationA = randomUUID();
  const organizationB = randomUUID();
  const owner = randomUUID();
  const requester = randomUUID();
  const treasuryOne = randomUUID();
  const treasuryTwo = randomUUID();
  const accountant = randomUUID();
  const signer = randomUUID();
  const foreignOwner = randomUUID();
  const actor = (userId: string, organizationId = organizationA) => ({
    userId,
    organizationId,
  });
  let vendorId = "";
  let materialVendorId = "";
  let destinationId = "";
  let obligationId = "";
  let requirementId = "";
  let policyId = "";
  beforeAll(async () => {
    await connection.db.insert(schema.organizations).values([
      { id: organizationA, name: "Control A" },
      { id: organizationB, name: "Control B" },
    ]);
    await connection.db.insert(schema.users).values(
      [
        owner,
        requester,
        treasuryOne,
        treasuryTwo,
        accountant,
        signer,
        foreignOwner,
      ].map((id, index) => ({
        id,
        email: `${id}@control.test`,
        displayName: `Control User ${index + 1}`,
      })),
    );
    await connection.db.insert(schema.memberships).values([
      { organizationId: organizationA, userId: owner, role: "OWNER" },
      { organizationId: organizationA, userId: requester, role: "OWNER" },
      { organizationId: organizationA, userId: treasuryOne, role: "TREASURY" },
      { organizationId: organizationA, userId: treasuryTwo, role: "TREASURY" },
      { organizationId: organizationA, userId: accountant, role: "ACCOUNTANT" },
      { organizationId: organizationA, userId: signer, role: "SIGNER" },
      { organizationId: organizationB, userId: foreignOwner, role: "OWNER" },
    ]);
    const vendor = await createVendor(connection.db, actor(requester), {
      legalName: "Control Vendor Limited",
      displayName: "Control Vendor",
    });
    vendorId = vendor.id;
    const materialVendor = await createVendor(connection.db, actor(requester), {
      legalName: "Replacement Vendor Limited",
      displayName: "Replacement Vendor",
    });
    materialVendorId = materialVendor.id;
    const materialDestination = await addVendorDestination(
      connection.db,
      actor(requester),
      materialVendor.id,
      { network: "ZCASH", receiver: `u1${"e".repeat(80)}` },
    );
    await verifyDestinationManually(
      connection.db,
      actor(treasuryOne),
      materialDestination!.id,
      "Recorded vendor call",
      "Replacement vendor receiver confirmed",
    );
    const destination = await addVendorDestination(
      connection.db,
      actor(requester),
      vendor.id,
      { network: "ZCASH", receiver: `u1${"c".repeat(80)}` },
    );
    destinationId = destination!.id;
    await verifyDestinationManually(
      connection.db,
      actor(treasuryOne),
      destinationId,
      "Video call",
      "Receiver confirmed with vendor finance lead",
    );
    const obligation = await createObligation(connection.db, actor(requester), {
      vendorId,
      type: "VENDOR_INVOICE",
      reference: "CTRL-15000",
      currency: "USD",
      amount: "15000.00",
      dueDate: "2026-12-20",
      description: "Material infrastructure services",
    });
    obligationId = obligation.id;
    const policy = await createDefaultPolicy(connection.db, actor(owner));
    policyId = policy.id;
  });
  afterAll(async () => {
    const orgs = [organizationA, organizationB];
    for (const table of [
      schema.settlementReadiness,
      schema.approvals,
      schema.approvalRequirements,
      schema.controlFindings,
      schema.policyDecisions,
      schema.policyVersions,
      schema.policies,
      schema.auditEvents,
      schema.duplicateFindings,
      schema.extractionRuns,
      schema.obligationVersions,
      schema.obligations,
      schema.obligationSources,
      schema.vendorDestinations,
      schema.vendors,
      schema.memberships,
    ])
      await connection.db
        .delete(table)
        .where(inArray(table.organizationId, orgs));
    await connection.db
      .delete(schema.users)
      .where(
        inArray(schema.users.id, [
          owner,
          requester,
          treasuryOne,
          treasuryTwo,
          accountant,
          signer,
          foreignOwner,
        ]),
      );
    await connection.db
      .delete(schema.organizations)
      .where(inArray(schema.organizations.id, orgs));
    await connection.close();
  });
  it("produces version-bound findings and threshold requirements", async () => {
    const decision = await evaluateObligationControls(
      connection.db,
      actor(requester),
      obligationId,
    );
    expect(decision?.result).toBe("APPROVAL_REQUIRED");
    const view = await getControlView(
      connection.db,
      organizationA,
      obligationId,
    );
    expect(view.findings.map((item) => item.code)).toEqual(
      expect.arrayContaining(["DESTINATION_ACCEPTABLE", "AMOUNT_TIER"]),
    );
    expect(view.requirements).toHaveLength(1);
    expect(view.requirements[0]).toMatchObject({
      role: "TREASURY",
      requiredCount: 2,
      prohibitCreator: true,
    });
    requirementId = view.requirements[0]!.id;
    expect(await listPolicies(connection.db, organizationB)).toEqual([]);
    expect(
      await createPolicyVersion(
        connection.db,
        actor(foreignOwner, organizationB),
        policyId,
        defaultPolicyConfig,
      ),
    ).toBeNull();
  });
  it("enforces authorization, separation of duties, concurrency and cross-tenant denial", async () => {
    await expect(
      createVendor(connection.db, actor(signer), {
        legalName: "Unauthorized Vendor Limited",
        displayName: "Unauthorized Vendor",
      }),
    ).rejects.toThrow("not authorized");
    await expect(
      decideApproval(connection.db, actor(requester), requirementId, "APPROVE"),
    ).rejects.toThrow("Creator cannot");
    await expect(
      decideApproval(
        connection.db,
        actor(accountant),
        requirementId,
        "APPROVE",
      ),
    ).rejects.toThrow("not eligible");
    await expect(
      verifyDestinationManually(
        connection.db,
        actor(accountant),
        destinationId,
        "Call",
        "Unauthorized verification attempt",
      ),
    ).rejects.toThrow("cannot verify destinations");
    expect(
      await decideApproval(
        connection.db,
        actor(foreignOwner, organizationB),
        requirementId,
        "APPROVE",
      ),
    ).toBeNull();
    const concurrent = await Promise.allSettled([
      decideApproval(
        connection.db,
        actor(treasuryOne),
        requirementId,
        "APPROVE",
      ),
      decideApproval(
        connection.db,
        actor(treasuryOne),
        requirementId,
        "APPROVE",
      ),
    ]);
    expect(
      concurrent.filter((item) => item.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      concurrent.filter((item) => item.status === "rejected"),
    ).toHaveLength(1);
    await decideApproval(
      connection.db,
      actor(treasuryTwo),
      requirementId,
      "APPROVE",
    );
    const approved = await getObligation(
      connection.db,
      organizationA,
      obligationId,
    );
    expect(approved?.obligation.state).toBe("APPROVED");
    expect(approved?.activity.map((event) => event.eventType)).toContain(
      "APPROVAL_GRANTED",
    );
  });
  it("reaches readiness, rejects stale policy, and invalidates on destination change", async () => {
    const ready = await evaluateSettlementReadiness(
      connection.db,
      actor(requester),
      obligationId,
    );
    expect(ready?.ready).toBe(true);
    expect(
      (await getObligation(connection.db, organizationA, obligationId))
        ?.obligation.state,
    ).toBe("READY_TO_SETTLE");
    await createPolicyVersion(
      connection.db,
      actor(owner),
      policyId,
      defaultPolicyConfig,
    );
    expect(
      (await getObligation(connection.db, organizationA, obligationId))
        ?.obligation.state,
    ).toBe("UNDER_REVIEW");
    expect(
      (
        await getControlView(connection.db, organizationA, obligationId)
      ).approvals.every((item) => item.approval.invalidatedAt),
    ).toBe(true);
    const stale = await evaluateSettlementReadiness(
      connection.db,
      actor(requester),
      obligationId,
    );
    expect(stale?.ready).toBe(false);
    expect(stale?.reasons.map((item) => item.code)).toContain(
      "STALE_POLICY_VERSION",
    );
    await addVendorDestination(connection.db, actor(requester), vendorId, {
      network: "ZCASH",
      receiver: `u1${"d".repeat(80)}`,
    });
    const changed = await getControlView(
      connection.db,
      organizationA,
      obligationId,
    );
    expect(
      (await getObligation(connection.db, organizationA, obligationId))
        ?.obligation.state,
    ).toBe("UNDER_REVIEW");
    expect(changed.approvals.every((item) => item.approval.invalidatedAt)).toBe(
      true,
    );
  });
  it("invalidates authorization after material obligation edits", async () => {
    const secondDestination = (
      await connection.db
        .select()
        .from(schema.vendorDestinations)
        .where(
          and(
            eq(schema.vendorDestinations.organizationId, organizationA),
            eq(schema.vendorDestinations.vendorId, vendorId),
          ),
        )
        .orderBy(schema.vendorDestinations.createdAt)
    )[1]!;
    await verifyDestinationManually(
      connection.db,
      actor(treasuryOne),
      secondDestination.id,
      "Signed message review",
      "Manually reviewed off-chain evidence",
    );
    await evaluateObligationControls(
      connection.db,
      actor(requester),
      obligationId,
    );
    const req = (
      await getControlView(connection.db, organizationA, obligationId)
    ).requirements[0]!;
    await decideApproval(connection.db, actor(treasuryOne), req.id, "APPROVE");
    await decideApproval(connection.db, actor(treasuryTwo), req.id, "APPROVE");
    await updateObligation(connection.db, actor(requester), obligationId, {
      vendorId: materialVendorId,
      type: "VENDOR_INVOICE",
      reference: "CTRL-15000-EDIT",
      currency: "USD",
      amount: "20000.00",
      dueDate: "2026-12-20",
      description: "Material infrastructure services amended",
    });
    const record = await getObligation(
      connection.db,
      organizationA,
      obligationId,
    );
    const view = await getControlView(
      connection.db,
      organizationA,
      obligationId,
    );
    expect(record?.obligation).toMatchObject({
      state: "UNDER_REVIEW",
      version: 2,
      amountMinor: 2000000n,
    });
    const versions = await connection.db
      .select()
      .from(schema.obligationVersions)
      .where(eq(schema.obligationVersions.obligationId, obligationId));
    expect(versions).toHaveLength(2);
    expect(versions.find((item) => item.version === 1)).toMatchObject({
      vendorId,
      amountMinor: 1500000n,
    });
    expect(versions.find((item) => item.version === 2)).toMatchObject({
      vendorId: materialVendorId,
      amountMinor: 2000000n,
    });
    expect(view.approvals.every((item) => item.approval.invalidatedAt)).toBe(
      true,
    );
    const stale = await evaluateSettlementReadiness(
      connection.db,
      actor(requester),
      obligationId,
    );
    expect(stale?.reasons.map((reason) => reason.code)).toContain(
      "STALE_OBLIGATION_VERSION",
    );
  });
  it("blocks unresolved possible duplicates and preserves audit integrity", async () => {
    const possible = await createObligation(connection.db, actor(requester), {
      vendorId: materialVendorId,
      type: "VENDOR_INVOICE",
      reference: "CTRL-DIFFERENT",
      currency: "USD",
      amount: "20000.00",
      dueDate: "2026-12-21",
      description: "Potential duplicate",
    });
    const decision = await evaluateObligationControls(
      connection.db,
      actor(requester),
      possible.id,
    );
    expect(decision?.result).toBe("BLOCKED");
    expect(
      (await getObligation(connection.db, organizationA, possible.id))
        ?.obligation.state,
    ).toBe("BLOCKED");
    expect(
      (
        await getControlView(connection.db, organizationA, possible.id)
      ).findings.map((item) => item.code),
    ).toContain("POSSIBLE_DUPLICATE_OPEN");
    expect((await verifyAuditChain(connection.db, organizationA)).valid).toBe(
      true,
    );
  });
});
