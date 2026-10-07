import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createDatabase, schema } from "@obliq/database";
import {
  addVendorDestination,
  createControlledQualificationQuote,
  createDefaultPolicy,
  createObligation,
  createVendor,
  decideApproval,
  evaluateObligationControls,
  evaluateSettlementReadiness,
  getControlView,
  prepareSettlementIntent,
  requestExternalSignature,
  verifyDestinationManually,
} from "@obliq/database/repositories";
import { eq } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL;
const recipientFile = process.env.OBLIQ_TESTNET_RECIPIENT_FILE;
const outputFile = process.env.OBLIQ_TESTNET_HANDOFF_FILE;
if (!databaseUrl || !recipientFile || !outputFile)
  throw new Error(
    "DATABASE_URL, OBLIQ_TESTNET_RECIPIENT_FILE and OBLIQ_TESTNET_HANDOFF_FILE are required",
  );

const response: unknown = JSON.parse(await readFile(recipientFile, "utf8"));
const receiver = readReceiver(response);
if (!receiver.startsWith("utest1"))
  throw new Error("A Zcash testnet Unified Address is required");

const connection = createDatabase(databaseUrl);
try {
  const organizationId = randomUUID();
  const ownerId = randomUUID();
  const financeId = randomUUID();
  const treasuryId = randomUUID();
  await connection.db.insert(schema.organizations).values({
    id: organizationId,
    name: "Public testnet qualification",
  });
  await connection.db.insert(schema.users).values([
    {
      id: ownerId,
      email: `${ownerId}@qualification.obliq.test`,
      displayName: "Qualification requester",
    },
    {
      id: financeId,
      email: `${financeId}@qualification.obliq.test`,
      displayName: "Qualification finance reviewer",
    },
    {
      id: treasuryId,
      email: `${treasuryId}@qualification.obliq.test`,
      displayName: "Qualification treasury reviewer",
    },
  ]);
  await connection.db.insert(schema.memberships).values([
    { organizationId, userId: ownerId, role: "OWNER" },
    { organizationId, userId: financeId, role: "FINANCE" },
    { organizationId, userId: treasuryId, role: "TREASURY" },
  ]);
  const owner = { organizationId, userId: ownerId };
  const vendor = await createVendor(connection.db, owner, {
    legalName: "Public Testnet Qualification Counterparty",
    displayName: "Public Testnet Qualification Counterparty",
  });
  const destination = await addVendorDestination(
    connection.db,
    owner,
    vendor.id,
    { network: "ZCASH", receiver },
  );
  if (!destination) throw new Error("Destination creation failed");
  await verifyDestinationManually(
    connection.db,
    { organizationId, userId: treasuryId },
    destination.id,
    "External wallet ceremony",
    "Testnet receiver generated outside Obliq and checked out of band",
  );
  const obligation = await createObligation(connection.db, owner, {
    vendorId: vendor.id,
    type: "VENDOR_INVOICE",
    reference: `PUBLIC-TESTNET-${Date.now()}`,
    currency: "USD",
    amount: "1.00",
    dueDate: "2026-12-31",
    description: "Public testnet shielded qualification payment",
  });
  await createDefaultPolicy(connection.db, owner);
  await evaluateObligationControls(connection.db, owner, obligation.id);
  const control = await getControlView(
    connection.db,
    organizationId,
    obligation.id,
  );
  for (const requirement of control.requirements) {
    const approver = requirement.role === "TREASURY" ? treasuryId : financeId;
    for (let index = 0; index < requirement.requiredCount; index += 1)
      await decideApproval(
        connection.db,
        { organizationId, userId: approver },
        requirement.id,
        "APPROVE",
        "Reviewed for the public testnet qualification only",
      );
  }
  const readiness = await evaluateSettlementReadiness(
    connection.db,
    owner,
    obligation.id,
  );
  if (!readiness?.ready) throw new Error("Control readiness did not pass");
  const quote = await createControlledQualificationQuote(connection.db, owner, {
    obligationId: obligation.id,
    zatoshiAmount: 100_000n,
    idempotencyKey: randomUUID(),
    network: "testnet",
    expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
  });
  const intent = await prepareSettlementIntent(connection.db, owner, {
    quoteId: quote.id,
    idempotencyKey: randomUUID(),
    requiredConfirmations: 3,
  });
  if (!intent) throw new Error("Settlement intent creation failed");
  const [settlement] = await connection.db
    .select()
    .from(schema.settlements)
    .where(eq(schema.settlements.intentId, intent.id))
    .limit(1);
  if (!settlement) throw new Error("Settlement creation failed");
  const signerRequestId = randomUUID();
  const handoff = await requestExternalSignature(
    connection.db,
    owner,
    settlement.id,
    signerRequestId,
  );
  if (!handoff) throw new Error("Signer handoff creation failed");
  if (
    handoff.network !== "testnet" ||
    handoff.amountZat !== "100000" ||
    handoff.privacyPolicy !== "FullPrivacy"
  )
    throw new Error("Unsafe or unexpected signer handoff");
  await writeFile(
    outputFile,
    JSON.stringify(
      {
        classification: "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST",
        organizationId,
        actorId: ownerId,
        obligationId: obligation.id,
        settlementId: settlement.id,
        signerRequestId,
        requiredConfirmations: 3,
        externalHandoffSchema: handoff.schema,
        ...handoff,
        schema: "obliq.public-testnet-handoff.v1",
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  console.log(
    JSON.stringify({
      classification: "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST",
      organizationId,
      obligationId: obligation.id,
      settlementId: settlement.id,
      intentHash: intent.intentHash,
      network: intent.network,
      amountZat: intent.zatoshiAmount.toString(),
      state: "AWAITING_SIGNATURE",
      externalActionRequired: true,
    }),
  );
} finally {
  await connection.close();
}

function readReceiver(value: unknown): string {
  if (!value || typeof value !== "object")
    throw new Error("Recipient file is malformed");
  const item = value as {
    address?: unknown;
    result?: unknown;
  };
  if (typeof item.address === "string") return item.address;
  if (typeof item.result === "string") return item.result;
  if (
    item.result &&
    typeof item.result === "object" &&
    "address" in item.result &&
    typeof item.result.address === "string"
  )
    return item.result.address;
  throw new Error("Recipient file contains no address");
}
