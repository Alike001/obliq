import { execFile, spawn } from "node:child_process";
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
  observerSource?: string;
}

export interface ShieldedAddressInspection {
  network: ZcashNetwork;
  orchardReceiverPresent: true;
  transparentReceiverPresent: false;
  receiverFingerprint: string;
}

export type ZcashAddressInspectionErrorCode =
  "ADDRESS_REJECTED" | "INSPECTOR_UNAVAILABLE" | "MALFORMED_OUTPUT";

export class ZcashAddressInspectionError extends Error {
  constructor(readonly code: ZcashAddressInspectionErrorCode) {
    super("Zcash address inspection failed");
    this.name = "ZcashAddressInspectionError";
  }
}

export function parseAddressInspectionOutput(
  stdout: string,
  network: ZcashNetwork,
): ShieldedAddressInspection {
  let parsed: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(stdout);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("not an object");
    parsed = value as Record<string, unknown>;
  } catch {
    throw new ZcashAddressInspectionError("MALFORMED_OUTPUT");
  }
  if (
    parsed.status === "INVALID" &&
    parsed.reasonCode === "ADDRESS_REJECTED" &&
    Object.keys(parsed).every((key) => ["status", "reasonCode"].includes(key))
  )
    throw new ZcashAddressInspectionError("ADDRESS_REJECTED");
  if (
    parsed.status !== "VALID" ||
    !Object.keys(parsed).every((key) =>
      [
        "status",
        "network",
        "orchardReceiverPresent",
        "transparentReceiverPresent",
        "receiverFingerprint",
      ].includes(key),
    ) ||
    Object.keys(parsed).length !== 5 ||
    parsed.network !== network ||
    parsed.orchardReceiverPresent !== true ||
    parsed.transparentReceiverPresent !== false ||
    typeof parsed.receiverFingerprint !== "string" ||
    !/^[0-9a-f]{64}$/u.test(parsed.receiverFingerprint)
  )
    throw new ZcashAddressInspectionError("MALFORMED_OUTPUT");
  return {
    network,
    orchardReceiverPresent: true,
    transparentReceiverPresent: false,
    receiverFingerprint: parsed.receiverFingerprint,
  };
}

export class ProcessZcashAddressInspector {
  constructor(
    private readonly binary: string,
    private readonly network: ZcashNetwork,
    private readonly timeoutMs = 5_000,
  ) {}

  inspect(receiver: string): Promise<ShieldedAddressInspection> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.binary, ["inspect-address"], {
        env: { OBSERVER_NETWORK: this.network },
        stdio: ["pipe", "pipe", "pipe"],
      });
      let stdout = "";
      child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
        if (stdout.length + chunk.length > 16 * 1024) {
          child.kill();
          fail("MALFORMED_OUTPUT");
          return;
        }
        stdout += chunk;
      });
      // Drain, but never retain or surface, process diagnostics. Decoder or
      // crash output could contain the submitted receiver.
      child.stderr.resume();
      let settled = false;
      const fail = (code: ZcashAddressInspectionErrorCode) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(new ZcashAddressInspectionError(code));
      };
      const timeout = setTimeout(
        () => {
          // Address decoding is local and bounded. A process that does not
          // answer promptly is infrastructure failure, never invalid-address
          // evidence. SIGKILL prevents an uncooperative child from lingering.
          child.kill("SIGKILL");
          fail("INSPECTOR_UNAVAILABLE");
        },
        Math.max(1, this.timeoutMs),
      );
      timeout.unref();
      child.once("error", () => fail("INSPECTOR_UNAVAILABLE"));
      child.once("close", (code) => {
        if (settled) return;
        clearTimeout(timeout);
        if (code !== 0) return fail("INSPECTOR_UNAVAILABLE");
        try {
          const parsed = parseAddressInspectionOutput(stdout, this.network);
          settled = true;
          resolve(parsed);
        } catch (error) {
          settled = true;
          reject(
            error instanceof Error
              ? error
              : new ZcashAddressInspectionError("MALFORMED_OUTPUT"),
          );
        }
      });
      // A short-lived process can close stdin after reading but before Node
      // observes the write completion. The process exit and structured stdout
      // remain authoritative; EPIPE itself is not classified as invalid.
      child.stdin.on("error", () => undefined);
      child.stdin.end(`${receiver}\n`);
    });
  }
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
    try {
      const { stdout } = await this.runner(this.config.binary, ["sync"], {
        OBSERVER_DB: this.config.databasePath,
        OBSERVER_ENDPOINT: this.config.endpoint,
        OBSERVER_NETWORK: this.config.network,
      });
      const parsed = parseObserverOutput(stdout);
      if (parsed.network !== this.config.network)
        throw new Error("Observer network does not match configured network");
      const status: ObserverStatus = {
        availability: parsed.synced ? "AVAILABLE" : "SYNCING",
        network: this.config.network,
        authority: parsed.authority,
        spendingAuthority: parsed.spendingAuthority,
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
          authority: "UFVK_VIEW_ONLY",
          spendingAuthority: false,
          reasonCode: classifyFailure(message),
        },
        observations: [],
      };
    }
  }
}

interface RawObserverOutput {
  network: ZcashNetwork;
  authority: "UFVK_VIEW_ONLY";
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
    candidate.authority !== "UFVK_VIEW_ONLY" ||
    candidate.spendingAuthority !== false ||
    !["regtest", "testnet", "mainnet"].includes(candidate.network ?? "") ||
    typeof candidate.chainTipHeight !== "number" ||
    !Number.isSafeInteger(candidate.chainTipHeight) ||
    typeof candidate.fullyScannedHeight !== "number" ||
    !Number.isSafeInteger(candidate.fullyScannedHeight) ||
    candidate.fullyScannedHeight > candidate.chainTipHeight ||
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
  if (/network.*(?:mismatch|does not match)/iu.test(message))
    return "NETWORK_MISMATCH";
  if (/viewing|ufvk/iu.test(message)) return "VIEWING_AUTHORITY_UNAVAILABLE";
  if (/connect|transport|node|rpc/iu.test(message)) return "NODE_UNAVAILABLE";
  if (/malformed|json|parse/iu.test(message))
    return "MALFORMED_OBSERVER_OUTPUT";
  return "OBSERVER_UNAVAILABLE";
}
