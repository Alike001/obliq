import {
  createDatabase,
  ingestShieldedObservation,
  recordObserverStatus,
} from "@obliq/database";
import { ProcessZcashObserver } from "@obliq/zcash/server";
import type { ZcashNetwork } from "@obliq/zcash";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const databaseUrl = required("DATABASE_URL");
const actor = {
  organizationId: required("OBLIQ_OBSERVER_ORGANIZATION_ID"),
  userId: required("OBLIQ_OBSERVER_ACTOR_ID"),
};
const network = required("OBSERVER_NETWORK") as ZcashNetwork;
if (!(["regtest", "testnet", "mainnet"] as const).includes(network))
  throw new Error("OBSERVER_NETWORK must be regtest, testnet, or mainnet");

const connection = createDatabase(databaseUrl);
try {
  const observer = new ProcessZcashObserver({
    binary: required("OBSERVER_BINARY"),
    databasePath: required("OBSERVER_DB"),
    endpoint: required("OBSERVER_ENDPOINT"),
    network,
    viewingAuthority: required("OBSERVER_UFVK"),
  });
  const scan = await observer.observe();
  await recordObserverStatus(connection.db, actor, scan.status);
  let stored = 0;
  let unmatched = 0;
  for (const observation of scan.observations) {
    const result = await ingestShieldedObservation(
      connection.db,
      actor,
      observation,
    );
    if (result.outcome === "STORED") stored += 1;
    else unmatched += 1;
  }
  process.stdout.write(
    `${JSON.stringify({
      availability: scan.status.availability,
      network,
      chainTipHeight: scan.status.chainTipHeight,
      fullyScannedHeight: scan.status.fullyScannedHeight,
      observed: scan.observations.length,
      stored,
      unmatched,
    })}\n`,
  );
} finally {
  await connection.close();
}
