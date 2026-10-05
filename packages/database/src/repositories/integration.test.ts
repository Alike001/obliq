import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { createDatabase, schema } from "../index";
import {
  ExactDuplicateError,
  addVendorDestination,
  createObligation,
  createSource,
  createVendor,
  getObligation,
  getSourceReview,
  getVendor,
  listObligations,
  listVendors,
  updateVendor,
  updateObligation,
  verifyAuditChain,
} from "./index";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const suite = databaseUrl ? describe : describe.skip;

suite("PostgreSQL repositories", () => {
  const connection = createDatabase(databaseUrl!);
  const organizationA = randomUUID();
  const organizationB = randomUUID();
  const userA = randomUUID();
  const userB = randomUUID();
  const actorA = { organizationId: organizationA, userId: userA };
  const actorB = { organizationId: organizationB, userId: userB };

  beforeAll(async () => {
    await connection.db.insert(schema.organizations).values([
      { id: organizationA, name: "Isolation A" },
      { id: organizationB, name: "Isolation B" },
    ]);
    await connection.db.insert(schema.users).values([
      { id: userA, email: `${userA}@test.obliq` },
      { id: userB, email: `${userB}@test.obliq` },
    ]);
    await connection.db.insert(schema.memberships).values([
      { organizationId: organizationA, userId: userA, role: "OWNER" },
      { organizationId: organizationB, userId: userB, role: "OWNER" },
    ]);
  });

  afterAll(async () => {
    const organizations = [organizationA, organizationB];
    await connection.db
      .delete(schema.auditEvents)
      .where(inArray(schema.auditEvents.organizationId, organizations));
    await connection.db
      .delete(schema.duplicateFindings)
      .where(inArray(schema.duplicateFindings.organizationId, organizations));
    await connection.db
      .delete(schema.extractionRuns)
      .where(inArray(schema.extractionRuns.organizationId, organizations));
    await connection.db
      .delete(schema.obligationVersions)
      .where(inArray(schema.obligationVersions.organizationId, organizations));
    await connection.db
      .delete(schema.obligations)
      .where(inArray(schema.obligations.organizationId, organizations));
    await connection.db
      .delete(schema.obligationSources)
      .where(inArray(schema.obligationSources.organizationId, organizations));
    await connection.db
      .delete(schema.vendorDestinations)
      .where(inArray(schema.vendorDestinations.organizationId, organizations));
    await connection.db
      .delete(schema.vendors)
      .where(inArray(schema.vendors.organizationId, organizations));
    await connection.db
      .delete(schema.memberships)
      .where(inArray(schema.memberships.organizationId, organizations));
    await connection.db
      .delete(schema.users)
      .where(inArray(schema.users.id, [userA, userB]));
    await connection.db
      .delete(schema.organizations)
      .where(inArray(schema.organizations.id, organizations));
    await connection.close();
  });

  it("persists vendors and immutable unverified destination history", async () => {
    const vendor = await createVendor(connection.db, actorA, {
      legalName: "Northstar Systems Limited",
      displayName: "Northstar",
      contactEmail: "finance@northstar.test",
    });
    const first = await addVendorDestination(connection.db, actorA, vendor.id, {
      network: "ZCASH",
      receiver: `u1${"a".repeat(80)}`,
    });
    const second = await addVendorDestination(
      connection.db,
      actorA,
      vendor.id,
      {
        network: "ZCASH",
        receiver: `u1${"b".repeat(80)}`,
      },
    );
    expect(first?.verificationStatus).toBe("UNVERIFIED");
    expect(second?.verificationStatus).toBe("UNVERIFIED");
    const history = await connection.db
      .select()
      .from(schema.vendorDestinations)
      .where(eq(schema.vendorDestinations.vendorId, vendor.id));
    expect(history).toHaveLength(2);
    expect(
      history.some((item) => item.verificationStatus === "SUPERSEDED"),
    ).toBe(true);
  });

  it("enforces server-side tenant isolation for vendors and modification", async () => {
    const [vendor] = await listVendors(connection.db, organizationA);
    expect(vendor).toBeDefined();
    expect(await listVendors(connection.db, organizationB)).toEqual([]);
    expect(
      await getVendor(connection.db, organizationB, vendor!.id),
    ).toBeNull();
    expect(
      await updateVendor(connection.db, actorB, vendor!.id, {
        legalName: "Intrusion Attempt Limited",
        displayName: "Intrusion Attempt",
      }),
    ).toBeNull();
  });

  it("persists reviewed obligations, blocks exact duplicates, and isolates sources", async () => {
    const [vendor] = await listVendors(connection.db, organizationA);
    const source = await createSource(connection.db, actorA, {
      kind: "INVOICE_UPLOAD",
      storageRef: `${organizationA}/safe.bin`,
      contentHash: "a".repeat(64),
      metadata: { originalFilename: "invoice.pdf" },
    });
    expect(
      await getSourceReview(connection.db, organizationB, source.id),
    ).toBeNull();
    const vendorB = await createVendor(connection.db, actorB, {
      legalName: "Tenant B Vendor Limited",
      displayName: "Tenant B Vendor",
    });
    await expect(
      createObligation(connection.db, actorB, {
        vendorId: vendorB.id,
        sourceId: source.id,
        type: "VENDOR_INVOICE",
        reference: "INV-100",
        currency: "USD",
        amount: "1250.00",
        dueDate: "2026-12-01",
        description: "Tenant escape",
      }),
    ).rejects.toThrow("Source is unavailable");
    const obligation = await createObligation(connection.db, actorA, {
      vendorId: vendor!.id,
      sourceId: source.id,
      type: "VENDOR_INVOICE",
      reference: "INV-100",
      currency: "USD",
      amount: "1250.00",
      dueDate: "2026-12-01",
      description: "Security review",
    });
    expect(obligation.amountMinor).toBe(125000n);
    expect(obligation.state).toBe("UNDER_REVIEW");
    await expect(
      createObligation(connection.db, actorA, {
        vendorId: vendor!.id,
        type: "VENDOR_INVOICE",
        reference: "inv100",
        currency: "USD",
        amount: "1250",
        dueDate: "2026-12-01",
        description: "Duplicate",
      }),
    ).rejects.toBeInstanceOf(ExactDuplicateError);
    const duplicateEvents = await connection.db
      .select()
      .from(schema.auditEvents)
      .where(
        and(
          eq(schema.auditEvents.organizationId, organizationA),
          eq(schema.auditEvents.eventType, "DUPLICATE_DETECTED"),
        ),
      );
    expect(duplicateEvents).toHaveLength(1);
    expect(duplicateEvents[0]?.payloadJson).toMatchObject({
      kind: "EXACT",
      creationBlocked: true,
    });
    expect(await listObligations(connection.db, organizationB)).toEqual([]);
    expect(
      await getObligation(connection.db, organizationB, obligation.id),
    ).toBeNull();
    expect(
      await updateObligation(connection.db, actorB, obligation.id, {
        vendorId: vendor!.id,
        type: "VENDOR_INVOICE",
        reference: "TAKEOVER",
        currency: "USD",
        amount: "1.00",
        dueDate: "2026-12-01",
        description: "Cross-tenant edit",
      }),
    ).toBeNull();
  });

  it("creates and verifies an organization-local audit hash chain", async () => {
    const result = await verifyAuditChain(connection.db, organizationA);
    expect(result.valid).toBe(true);
    expect(result.eventCount).toBeGreaterThan(4);
    const foreign = await connection.db
      .select()
      .from(schema.auditEvents)
      .where(
        and(
          eq(schema.auditEvents.organizationId, organizationB),
          eq(schema.auditEvents.actorId, userA),
        ),
      );
    expect(foreign).toEqual([]);
  });

  it("serializes concurrent duplicate decisions per organization", async () => {
    const [vendor] = await listVendors(connection.db, organizationA);
    const input = {
      vendorId: vendor!.id,
      type: "CONTRACTOR_BILL",
      reference: "CONCURRENT-ONE",
      currency: "USD",
      amount: "900.00",
      dueDate: "2026-12-10",
      description: "Concurrent duplicate check",
    };
    const results = await Promise.allSettled([
      createObligation(connection.db, actorA, input),
      createObligation(connection.db, actorA, input),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
  });
});
