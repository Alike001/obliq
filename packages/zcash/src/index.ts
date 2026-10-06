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
  settlementExecution: "EXTERNAL_REGTEST_ONLY",
  serverSpendAuthority: "NONE",
  tracerPool: "IRONWOOD",
} as const;

const zatoshisPerZec = 100_000_000n;
const maximumZatoshis = 21_000_000n * zatoshisPerZec;

export interface Zip321Payment {
  network: ZcashNetwork;
  receiver: string;
  amountZat: bigint;
  memoReference: string;
}

export interface SettlementIntentBinding {
  organizationId: string;
  obligationId: string;
  obligationVersion: number;
  policyDecisionId: string;
  vendorId: string;
  destinationId: string;
  destinationReceiver: string;
  businessCurrency: string;
  businessAmountMinor: string;
  quoteId: string;
  quoteVersion: number;
  quoteSource: string;
  quotedAt: string;
  quoteExpiresAt: string;
  amountZat: string;
  memoReference: string;
  network: ZcashNetwork;
  privacyMode: "SHIELDED";
  intentVersion: number;
}

export interface ExternalSignerHandoff {
  schema: "obliq.external-signer-handoff.v1";
  intentId: string;
  intentHash: string;
  paymentRequest: string;
  network: ZcashNetwork;
  privacyPolicy: "FullPrivacy";
  receiver: string;
  amountZat: string;
  memoReference: string;
  quoteExpiresAt: string;
}

export function formatZecAmount(amountZat: bigint): string {
  if (amountZat <= 0n || amountZat > maximumZatoshis)
    throw new Error("Zatoshi amount is outside the valid ZIP-321 range");
  const whole = amountZat / zatoshisPerZec;
  const fraction = (amountZat % zatoshisPerZec)
    .toString()
    .padStart(8, "0")
    .replace(/0+$/u, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function parseZecAmount(value: string): bigint {
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,8})?$/u.test(value))
    throw new Error("Invalid ZIP-321 ZEC amount");
  const [whole = "", fraction = ""] = value.split(".");
  const amount =
    BigInt(whole) * zatoshisPerZec + BigInt(fraction.padEnd(8, "0") || "0");
  if (amount <= 0n || amount > maximumZatoshis)
    throw new Error("ZIP-321 amount is outside the valid range");
  return amount;
}

function assertShieldedReceiver(network: ZcashNetwork, receiver: string) {
  const pattern =
    network === "regtest"
      ? /^uregtest1[0-9a-z]+$/u
      : network === "testnet"
        ? /^utest1[0-9a-z]+$/u
        : /^u1[0-9a-z]+$/u;
  if (!pattern.test(receiver))
    throw new Error(
      "Receiver must be a Unified Address for the selected network",
    );
}

export function createZip321PaymentRequest(payment: Zip321Payment): string {
  assertShieldedReceiver(payment.network, payment.receiver);
  const memo = Buffer.from(payment.memoReference, "utf8");
  if (memo.length === 0 || memo.length > 512)
    throw new Error("ZIP-321 memo must contain between 1 and 512 bytes");
  return `zcash:${payment.receiver}?amount=${formatZecAmount(payment.amountZat)}&memo=${memo.toString("base64url")}`;
}

export function parseZip321PaymentRequest(
  request: string,
  network: ZcashNetwork,
): Zip321Payment {
  if (!request.startsWith("zcash:") || request.includes("#"))
    throw new Error("Invalid ZIP-321 request");
  const [receiver, query, extra] = request.slice(6).split("?");
  if (!receiver || !query || extra !== undefined)
    throw new Error("Obliq supports one-payment ZIP-321 requests only");
  assertShieldedReceiver(network, receiver);
  const params = new URLSearchParams(query);
  if (
    [...params.keys()].some((key) => key !== "amount" && key !== "memo") ||
    params.getAll("amount").length !== 1 ||
    params.getAll("memo").length !== 1
  )
    throw new Error("Unsupported or duplicate ZIP-321 parameter");
  const amount = params.get("amount");
  const memo = params.get("memo");
  if (!amount || !memo || /=/u.test(memo) || !/^[A-Za-z0-9_-]+$/u.test(memo))
    throw new Error("Invalid ZIP-321 amount or memo encoding");
  const memoBytes = Buffer.from(memo, "base64url");
  if (memoBytes.length === 0 || memoBytes.length > 512)
    throw new Error("Invalid ZIP-321 memo length");
  return {
    network,
    receiver,
    amountZat: parseZecAmount(amount),
    memoReference: memoBytes.toString("utf8"),
  };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export function settlementIntentHash(binding: SettlementIntentBinding): string {
  return createHash("sha256").update(canonical(binding)).digest("hex");
}

export const memoReferenceForIntent = (intentId: string) =>
  `obliq:v1:${intentId}`;

export function createExternalSignerHandoff(input: {
  intentId: string;
  intentHash: string;
  network: ZcashNetwork;
  receiver: string;
  amountZat: bigint;
  quoteExpiresAt: Date;
}): ExternalSignerHandoff {
  const memoReference = memoReferenceForIntent(input.intentId);
  return {
    schema: "obliq.external-signer-handoff.v1",
    intentId: input.intentId,
    intentHash: input.intentHash,
    paymentRequest: createZip321PaymentRequest({
      network: input.network,
      receiver: input.receiver,
      amountZat: input.amountZat,
      memoReference,
    }),
    network: input.network,
    privacyPolicy: "FullPrivacy",
    receiver: input.receiver,
    amountZat: input.amountZat.toString(),
    memoReference,
    quoteExpiresAt: input.quoteExpiresAt.toISOString(),
  };
}
