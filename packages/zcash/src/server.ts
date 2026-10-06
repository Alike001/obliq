import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  receiverFingerprint,
  redactZcashSecrets,
  type ObserverScanResult,
  type ObserverStatus,
  type ShieldedPool,
  type ZcashNetwork,
  type ZcashObserver,
} from "./index";

const runFile = promisify(execFile);

export interface ProcessObserverConfig {
  binary: string;
  databasePath: string;
  endpoint: string;
  network: ZcashNetwork;
  viewingAuthority: string;
  observerSource?: string;
}

type CommandRunner = (
  file: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
) => Promise<{ stdout: string }>;

export class ProcessZcashObserver implements ZcashObserver {
  constructor(
    private readonly config: ProcessObserverConfig,
    private readonly runner: CommandRunner = async (file, args, env) =>
      runFile(file, [...args], {
        env,
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
      }),
  ) {}

  async status(): Promise<ObserverStatus> {
    return (await this.observe()).status;
  }

  async observe(): Promise<ObserverScanResult> {
    if (this.config.network !== "regtest")
      return {
        status: {
          availability: "MISCONFIGURED",
          network: this.config.network,
          reasonCode: "PUBLIC_NETWORK_UNAVAILABLE",
        },
        observations: [],
      };
    try {
      const { stdout } = await this.runner(this.config.binary, ["sync"], {
        OBSERVER_DB: this.config.databasePath,
        OBSERVER_ENDPOINT: this.config.endpoint,
        OBSERVER_UFVK: this.config.viewingAuthority,
      });
      const parsed = parseObserverOutput(stdout);
      if (parsed.network !== this.config.network)
        throw new Error("Observer network does not match configured network");
      const status: ObserverStatus = {
        availability: parsed.synced ? "AVAILABLE" : "SYNCING",
        network: this.config.network,
        chainTipHeight: parsed.chainTipHeight,
        fullyScannedHeight: parsed.fullyScannedHeight,
      };
      return {
        status,
        observations: parsed.observations.map((item) => ({
          network: this.config.network,
          txid: item.txid,
          outputIndex: item.outputIndex,
          pool: item.pool,
          amountZat: BigInt(item.amountZat),
          minedHeight: item.minedHeight,
          confirmations: item.confirmations,
          receiverFingerprint: receiverFingerprint(item.receiver),
          ...(item.memoReference ? { memoReference: item.memoReference } : {}),
          observedAt: new Date(),
          observerSource:
            this.config.observerSource ?? "obliq-zcash-observer/0.1.0",
        })),
      };
    } catch (error) {
      const message = redactZcashSecrets(
        error instanceof Error ? error.message : "Observer command failed",
      );
      return {
        status: {
          availability: "UNAVAILABLE",
          network: this.config.network,
          reasonCode: classifyFailure(message),
        },
        observations: [],
      };
    }
  }
}

interface RawObserverOutput {
  network: ZcashNetwork;
  spendingAuthority: false;
  chainTipHeight: number;
  fullyScannedHeight: number;
  synced: boolean;
  observations: {
    txid: string;
    outputIndex: number;
    pool: ShieldedPool;
    amountZat: string;
    memoReference?: string | null;
    minedHeight: number;
    confirmations: number;
    receiver: string;
  }[];
}

function parseObserverOutput(value: string): RawObserverOutput {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object")
    throw new Error("Malformed observer output");
  const candidate = parsed as Partial<RawObserverOutput>;
  if (
    candidate.spendingAuthority !== false ||
    candidate.network !== "regtest" ||
    !Number.isSafeInteger(candidate.chainTipHeight) ||
    !Number.isSafeInteger(candidate.fullyScannedHeight) ||
    typeof candidate.synced !== "boolean" ||
    !Array.isArray(candidate.observations)
  )
    throw new Error("Malformed observer output");
  for (const item of candidate.observations) {
    if (
      !/^[0-9a-f]{64}$/u.test(item.txid) ||
      !Number.isSafeInteger(item.outputIndex) ||
      item.outputIndex < 0 ||
      !["SAPLING", "ORCHARD", "IRONWOOD"].includes(item.pool) ||
      !/^[0-9]+$/u.test(item.amountZat) ||
      !Number.isSafeInteger(item.minedHeight) ||
      item.minedHeight < 0 ||
      !Number.isSafeInteger(item.confirmations) ||
      item.confirmations < 0 ||
      typeof item.receiver !== "string" ||
      item.receiver.length === 0
    )
      throw new Error("Malformed observer output");
  }
  return candidate as RawObserverOutput;
}

function classifyFailure(message: string): string {
  if (/viewing|ufvk/iu.test(message)) return "VIEWING_AUTHORITY_UNAVAILABLE";
  if (/connect|transport|node|rpc/iu.test(message)) return "NODE_UNAVAILABLE";
  if (/malformed|json|parse/iu.test(message))
    return "MALFORMED_OBSERVER_OUTPUT";
  return "OBSERVER_UNAVAILABLE";
}
