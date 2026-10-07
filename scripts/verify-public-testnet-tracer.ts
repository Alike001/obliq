import { readFile, stat, writeFile } from "node:fs/promises";
import { createDatabase, schema } from "@obliq/database";
import {
  ingestShieldedObservation,
  recordObserverStatus,
  verifyAuditChain,
} from "@obliq/database/repositories";
import {
  buildPublicTestnetQualificationReport,
  type PublicTestnetQualificationMode,
  type QualificationSnapshot,
} from "@obliq/zcash/qualification";
import { ProcessZcashObserver } from "@obliq/zcash/server";
import { and, eq, sql } from "drizzle-orm";

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const mode = (process.env.OBLIQ_TESTNET_MODE ??
  "UNFUNDED_SYNCHRONIZATION") as PublicTestnetQualificationMode;
if (!(["UNFUNDED_SYNCHRONIZATION", "FUNDED_PAYMENT"] as const).includes(mode))
  throw new Error("OBLIQ_TESTNET_MODE is invalid");

const databaseUrl = required("DATABASE_URL");
const handoffFile = required("OBLIQ_TESTNET_HANDOFF_FILE");
const evidenceFile = required("OBLIQ_TESTNET_EVIDENCE_FILE");
const handoffStat = await stat(handoffFile);
if ((handoffStat.mode & 0o077) !== 0)
  throw new Error(
    "Testnet handoff file must not be accessible by group or other",
  );
const handoff = readHandoff(await readFile(handoffFile, "utf8"));
const priorProgression = await readPriorProgression(evidenceFile);

const observer = new ProcessZcashObserver({
  binary: required("OBSERVER_BINARY"),
  databasePath: required("OBSERVER_DB"),
  endpoint: required("OBSERVER_ENDPOINT"),
  network: "testnet",
  viewingAuthority: required("OBSERVER_UFVK"),
  observerSource:
    process.env.OBSERVER_SOURCE ?? "obliq-zcash-observer/public-testnet",
});
const scan = await observer.observe();
const connection = createDatabase(databaseUrl);
try {
  const actor = {
    organizationId: handoff.organizationId,
    userId: handoff.actorId,
  };
  await recordObserverStatus(connection.db, actor, scan.status);
  const [target] = await connection.db
    .select()
    .from(schema.settlementObservationTargets)
    .where(
      and(
        eq(
          schema.settlementObservationTargets.organizationId,
          handoff.organizationId,
        ),
        eq(
          schema.settlementObservationTargets.settlementId,
          handoff.settlementId,
        ),
      ),
    )
    .limit(1);
  if (!target || target.network !== "testnet")
    throw new Error("A testnet observation target is required");
  if (target.expectedAmountZat !== 100_000n)
    throw new Error("Observation target amount is not the qualified amount");
  const [execution] = await connection.db
    .select({
      state: schema.settlements.state,
      txRefPrivate: schema.settlements.txRefPrivate,
      intentId: schema.settlements.intentId,
      intentHash: schema.settlements.intentHash,
      obligationId: schema.settlements.obligationId,
    })
    .from(schema.settlements)
    .where(
      and(
        eq(schema.settlements.organizationId, handoff.organizationId),
        eq(schema.settlements.id, handoff.settlementId),
      ),
    )
    .limit(1);
  if (
    !execution ||
    execution.intentId !== handoff.intentId ||
    execution.intentHash !== handoff.intentHash
  )
    throw new Error("Testnet handoff does not match its persisted intent");
  const report = buildPublicTestnetQualificationReport({
    mode,
    scan,
    target: {
      network: "testnet",
      receiverFingerprint: target.receiverFingerprint,
      memoReferenceHash: target.memoReferenceHash,
      expectedAmountZat: target.expectedAmountZat,
      requiredConfirmations: target.requiredConfirmations,
    },
    priorProgression,
  });

  if (mode === "FUNDED_PAYMENT" && report.observation) {
    const observed = scan.observations.find(
      (item) =>
        item.txid === report.observation?.transactionReference &&
        item.outputIndex === report.observation.outputIndex,
    );
    if (!observed) throw new Error("Qualified observation disappeared");
    const broadcastReceiptPresent = [
      "BROADCAST",
      "DETECTED",
      "CONFIRMING",
      "SETTLED",
      "MISMATCH",
    ].includes(execution.state);
    if (
      !broadcastReceiptPresent ||
      !execution.txRefPrivate ||
      execution.txRefPrivate !== observed.txid
    )
      report.classification = "PUBLIC_NETWORK_FUNDED_TEST_BLOCKED";
    if (
      !broadcastReceiptPresent ||
      !execution.txRefPrivate ||
      execution.txRefPrivate !== observed.txid
    )
      report.blockers = [
        ...report.blockers,
        "SANITIZED_SIGNING_AND_BROADCAST_RECEIPT_REQUIRED",
      ];
    else {
      const first = await ingestShieldedObservation(
        connection.db,
        actor,
        observed,
      );
      const repeat = await ingestShieldedObservation(
        connection.db,
        actor,
        observed,
      );
      const [count] = await connection.db
        .select({ value: sql<number>`count(*)::int` })
        .from(schema.settlementObservations)
        .where(
          and(
            eq(
              schema.settlementObservations.organizationId,
              handoff.organizationId,
            ),
            eq(schema.settlementObservations.network, "testnet"),
            eq(schema.settlementObservations.txid, observed.txid),
            eq(schema.settlementObservations.pool, observed.pool),
            eq(schema.settlementObservations.outputIndex, observed.outputIndex),
          ),
        );
      const firstIngestion = first.outcome;
      const repeatIngestionChanged =
        repeat.outcome === "STORED" ? repeat.changed : true;
      const observationRowCount = count?.value ?? 0;
      const [finalSettlement] = await connection.db
        .select({ state: schema.settlements.state })
        .from(schema.settlements)
        .where(
          and(
            eq(schema.settlements.organizationId, handoff.organizationId),
            eq(schema.settlements.id, handoff.settlementId),
          ),
        )
        .limit(1);
      const [finalObligation] = await connection.db
        .select({ state: schema.obligations.state })
        .from(schema.obligations)
        .where(
          and(
            eq(schema.obligations.organizationId, handoff.organizationId),
            eq(schema.obligations.id, execution.obligationId),
          ),
        )
        .limit(1);
      const auditChainValid = (
        await verifyAuditChain(connection.db, handoff.organizationId)
      ).valid;
      report.persistence = {
        firstIngestion,
        repeatIngestionChanged,
        observationRowCount,
        broadcastReceiptPresent,
        settlementState: finalSettlement?.state ?? "UNAVAILABLE",
        obligationState: finalObligation?.state ?? "UNAVAILABLE",
        auditChainValid,
        idempotent:
          firstIngestion === "STORED" &&
          !repeatIngestionChanged &&
          observationRowCount === 1 &&
          auditChainValid,
      };
      const canonicalStateMatches =
        report.classification !== "PUBLIC_NETWORK_VERIFIED" ||
        (report.persistence.settlementState === "SETTLED" &&
          report.persistence.obligationState === "SETTLED");
      if (!report.persistence.idempotent || !canonicalStateMatches)
        report.classification = "PUBLIC_NETWORK_FUNDED_TEST_BLOCKED";
      if (!report.persistence.idempotent)
        report.blockers = [...report.blockers, "IDEMPOTENT_INGESTION_FAILED"];
      if (!canonicalStateMatches)
        report.blockers = [
          ...report.blockers,
          "CANONICAL_SETTLEMENT_STATE_NOT_RECONCILED",
        ];
    }
  }

  await writeFile(evidenceFile, JSON.stringify(report, null, 2), {
    mode: 0o600,
  });
  console.log(
    JSON.stringify({
      classification: report.classification,
      mode: report.mode,
      network: report.network,
      observerAvailability: report.observer.availability,
      fullyScannedHeight: report.observer.fullyScannedHeight,
      blockers: report.blockers,
      evidenceFileWritten: true,
    }),
  );
} finally {
  await connection.close();
}

function readHandoff(value: string) {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object")
    throw new Error("Testnet handoff is malformed");
  const item = parsed as Record<string, unknown>;
  if (
    item.schema !== "obliq.public-testnet-handoff.v1" ||
    item.network !== "testnet" ||
    item.amountZat !== "100000" ||
    item.privacyPolicy !== "FullPrivacy" ||
    typeof item.organizationId !== "string" ||
    typeof item.actorId !== "string" ||
    typeof item.settlementId !== "string" ||
    typeof item.intentId !== "string" ||
    typeof item.intentHash !== "string" ||
    !/^[0-9a-f]{64}$/u.test(item.intentHash)
  )
    throw new Error("Testnet handoff failed safety validation");
  return item as {
    organizationId: string;
    actorId: string;
    settlementId: string;
    intentId: string;
    intentHash: string;
  } & Record<string, unknown>;
}

async function readPriorProgression(
  filename: string,
): Promise<readonly QualificationSnapshot[]> {
  try {
    const parsed: unknown = JSON.parse(await readFile(filename, "utf8"));
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("schema" in parsed) ||
      parsed.schema !== "obliq.public-testnet-qualification.v1" ||
      !("network" in parsed) ||
      parsed.network !== "testnet" ||
      !("progression" in parsed) ||
      !Array.isArray(parsed.progression) ||
      !parsed.progression.every(isQualificationSnapshot)
    )
      throw new Error("Prior evidence report is malformed");
    return parsed.progression;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as NodeJS.ErrnoException).code === "ENOENT"
    )
      return [];
    throw error;
  }
}

function isQualificationSnapshot(
  value: unknown,
): value is QualificationSnapshot {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.observedAt === "string" &&
    Number.isSafeInteger(item.chainTipHeight) &&
    Number.isSafeInteger(item.fullyScannedHeight) &&
    (item.confirmations === undefined ||
      Number.isSafeInteger(item.confirmations)) &&
    (item.reconciliationState === undefined ||
      typeof item.reconciliationState === "string")
  );
}
