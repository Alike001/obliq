import { createHash } from "node:crypto";

/** Server-only read path. It intentionally has no signing or broadcast method. */
export interface ZcashObserver {
  status(): Promise<ObserverStatus>;
  observe(): Promise<ObserverScanResult>;
}

export type ZcashNetwork = "regtest" | "testnet" | "mainnet";
export type ShieldedPool = "SAPLING" | "ORCHARD" | "IRONWOOD";
export type ObserverAvailability =
  "AVAILABLE" | "SYNCING" | "UNAVAILABLE" | "MISCONFIGURED";

export interface ObserverStatus {
  availability: ObserverAvailability;
  network: ZcashNetwork;
  chainTipHeight?: number;
  fullyScannedHeight?: number;
  reasonCode?: string;
}

export interface NormalizedShieldedOutput {
  network: ZcashNetwork;
  txid: string;
  outputIndex: number;
  pool: ShieldedPool;
  amountZat: bigint;
  minedHeight: number;
  confirmations: number;
  receiverFingerprint: string;
  memoReference?: string;
  observedAt: Date;
  observerSource: string;
}

export interface ObserverScanResult {
  status: ObserverStatus;
  observations: readonly NormalizedShieldedOutput[];
}

export type CorrelationStatus =
  | "MATCHED"
  | "AMOUNT_MISMATCH"
  | "UNKNOWN_REFERENCE"
  | "UNKNOWN_RECEIVER"
  | "MALFORMED";
export type ReconciliationState =
  "DETECTED" | "CONFIRMING" | "SETTLED" | "MISMATCH";

export interface ObservationTarget {
  network: ZcashNetwork;
  receiverFingerprint: string;
  memoReferenceHash: string;
  expectedAmountZat: bigint;
  requiredConfirmations: number;
}

export interface ReconciliationResult {
  correlation: CorrelationStatus;
  state: ReconciliationState;
  reasons: readonly { code: string; message: string }[];
}

export function isNormalizedObservation(
  observation: NormalizedShieldedOutput,
): boolean {
  return (
    /^[0-9a-f]{64}$/u.test(observation.txid) &&
    Number.isSafeInteger(observation.outputIndex) &&
    observation.outputIndex >= 0 &&
    observation.amountZat >= 0n &&
    Number.isSafeInteger(observation.minedHeight) &&
    observation.minedHeight >= 0 &&
    Number.isSafeInteger(observation.confirmations) &&
    observation.confirmations >= 0 &&
    /^[0-9a-f]{64}$/u.test(observation.receiverFingerprint)
  );
}

export const memoReferenceHash = (reference: string) =>
  createHash("sha256").update(reference, "utf8").digest("hex");

export const receiverFingerprint = (receiver: string) =>
  createHash("sha256").update(receiver, "utf8").digest("hex");

export function reconcileObservation(
  target: ObservationTarget,
  observation: NormalizedShieldedOutput,
): ReconciliationResult {
  if (!isNormalizedObservation(observation))
    return mismatch("MALFORMED_OBSERVATION", "Observer output is malformed.");
  if (observation.network !== target.network)
    return mismatch("NETWORK_MISMATCH", "Observation is from another network.");
  if (observation.receiverFingerprint !== target.receiverFingerprint)
    return mismatch(
      "UNKNOWN_RECEIVER",
      "The output receiver does not match this obligation target.",
      "UNKNOWN_RECEIVER",
    );
  if (
    !observation.memoReference ||
    memoReferenceHash(observation.memoReference) !== target.memoReferenceHash
  )
    return mismatch(
      "UNKNOWN_REFERENCE",
      "The opaque memo reference does not match this obligation target.",
      "UNKNOWN_REFERENCE",
    );
  if (observation.amountZat !== target.expectedAmountZat)
    return mismatch(
      "AMOUNT_MISMATCH",
      "The observed zatoshi amount differs from the expected amount.",
      "AMOUNT_MISMATCH",
    );
  if (observation.confirmations < 1)
    return {
      correlation: "MATCHED",
      state: "DETECTED",
      reasons: [
        { code: "UNMINED", message: "Output is detected but not mined." },
      ],
    };
  if (observation.confirmations < target.requiredConfirmations)
    return {
      correlation: "MATCHED",
      state: "CONFIRMING",
      reasons: [
        {
          code: "CONFIRMATIONS_REQUIRED",
          message: `${target.requiredConfirmations - observation.confirmations} more confirmation(s) required.`,
        },
      ],
    };
  return { correlation: "MATCHED", state: "SETTLED", reasons: [] };
}

function mismatch(
  code: string,
  message: string,
  correlation: CorrelationStatus = "MALFORMED",
): ReconciliationResult {
  return { correlation, state: "MISMATCH", reasons: [{ code, message }] };
}

const secretPatterns = [
  /uview(?:regtest|test)?1[a-z0-9]+/gi,
  /secret[-_ ]?extended[-_ ]?key\s*[:=]\s*\S+/gi,
  /(?:seed|mnemonic|spending[_ -]?key)\s*[:=]\s*\S+(?:\s+\S+){0,23}/gi,
] as const;

export function redactZcashSecrets(value: string): string {
  return secretPatterns.reduce(
    (redacted, pattern) => redacted.replace(pattern, "[REDACTED]"),
    value,
  );
}

export const zcashCapability = {
  shieldedObservation: "IMPLEMENTED",
  reconciliation: "IMPLEMENTED",
  settlementExecution: "UNAVAILABLE",
  serverSpendAuthority: "NONE",
  tracerPool: "IRONWOOD",
} as const;
