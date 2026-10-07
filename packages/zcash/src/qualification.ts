import {
  memoReferenceHash,
  reconcileObservation,
  type NormalizedShieldedOutput,
  type ObservationTarget,
  type ObserverScanResult,
} from "./index";

export type PublicTestnetQualificationMode =
  "UNFUNDED_SYNCHRONIZATION" | "FUNDED_PAYMENT";

export type PublicTestnetClassification =
  | "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST"
  | "PUBLIC_NETWORK_FUNDED_TEST_BLOCKED"
  | "PUBLIC_NETWORK_CONFIRMING"
  | "PUBLIC_NETWORK_VERIFIED";

export interface QualificationSnapshot {
  observedAt: string;
  chainTipHeight: number;
  fullyScannedHeight: number;
  confirmations?: number;
  reconciliationState?: string;
}

export interface PublicTestnetQualificationReport {
  schema: "obliq.public-testnet-qualification.v1";
  generatedAt: string;
  mode: PublicTestnetQualificationMode;
  classification: PublicTestnetClassification;
  network: "testnet";
  observer: {
    availability: string;
    authority: "UFVK_VIEW_ONLY" | "UNPROVEN";
    spendingAuthority: "NONE" | "UNPROVEN";
    chainTipHeight?: number;
    fullyScannedHeight?: number;
  };
  expectedPayment?: {
    amountZat: string;
    receiverFingerprint: string;
    memoReferenceHash: string;
    requiredConfirmations: number;
  };
  observation?: {
    transactionReference: string;
    outputIndex: number;
    pool: string;
    minedHeight: number;
    confirmations: number;
    correlation: string;
    reconciliationState: string;
    reasons: readonly string[];
  };
  progression: readonly QualificationSnapshot[];
  checks: {
    networkIdentity: boolean;
    synchronized: boolean;
    readOnlyAuthority: boolean;
    exactAmountAndMemo: boolean | "NOT_RUN";
    confirmationPolicy: boolean | "NOT_RUN";
  };
  persistence?: {
    firstIngestion: "STORED" | "UNMATCHED";
    repeatIngestionChanged: boolean;
    observationRowCount: number;
    broadcastReceiptPresent: boolean;
    settlementState: string;
    obligationState: string;
    auditChainValid: boolean;
    idempotent: boolean;
  };
  blockers: readonly string[];
}

interface BuildReportInput {
  mode: PublicTestnetQualificationMode;
  scan: ObserverScanResult;
  target?: ObservationTarget;
  priorProgression?: readonly QualificationSnapshot[];
  now?: Date;
}

export function buildPublicTestnetQualificationReport(
  input: BuildReportInput,
): PublicTestnetQualificationReport {
  const { scan, mode, target } = input;
  const now = input.now ?? new Date();
  const networkIdentity = scan.status.network === "testnet";
  const synchronized =
    scan.status.availability === "AVAILABLE" &&
    scan.status.chainTipHeight !== undefined &&
    scan.status.fullyScannedHeight !== undefined &&
    scan.status.fullyScannedHeight >= scan.status.chainTipHeight;
  const readOnlyAuthority =
    scan.status.authority === "UFVK_VIEW_ONLY" &&
    scan.status.spendingAuthority === false;
  const blockers: string[] = [];
  if (!networkIdentity) blockers.push("NETWORK_IDENTITY_MISMATCH");
  if (!synchronized) blockers.push("OBSERVER_NOT_SYNCHRONIZED");
  if (!readOnlyAuthority) blockers.push("READ_ONLY_AUTHORITY_NOT_PROVEN");

  if (mode === "UNFUNDED_SYNCHRONIZATION") {
    blockers.push("REAL_FUNDED_SHIELDED_PAYMENT_REQUIRED");
    return {
      schema: "obliq.public-testnet-qualification.v1",
      generatedAt: now.toISOString(),
      mode,
      classification:
        networkIdentity && synchronized && readOnlyAuthority
          ? "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST"
          : "PUBLIC_NETWORK_FUNDED_TEST_BLOCKED",
      network: "testnet",
      observer: observerEvidence(scan),
      progression: [],
      checks: {
        networkIdentity,
        synchronized,
        readOnlyAuthority,
        exactAmountAndMemo: "NOT_RUN",
        confirmationPolicy: "NOT_RUN",
      },
      blockers,
    };
  }

  if (!target || target.network !== "testnet") {
    blockers.push("VALID_TESTNET_TARGET_REQUIRED");
    return blockedFundedReport(input, blockers, {
      networkIdentity,
      synchronized,
      readOnlyAuthority,
      exactAmountAndMemo: false,
      confirmationPolicy: false,
    });
  }

  const correlated = scan.observations
    .map((observation) => ({
      observation,
      result: reconcileObservation(target, observation),
    }))
    .find(({ result }) => result.correlation !== "UNKNOWN_RECEIVER");
  if (!correlated) {
    blockers.push("EXPECTED_SHIELDED_OUTPUT_NOT_OBSERVED");
    return blockedFundedReport(input, blockers, {
      networkIdentity,
      synchronized,
      readOnlyAuthority,
      exactAmountAndMemo: false,
      confirmationPolicy: false,
    });
  }

  const { observation, result } = correlated;
  const exactAmountAndMemo = result.correlation === "MATCHED";
  const confirmationPolicy = result.state === "SETTLED";
  if (!exactAmountAndMemo)
    blockers.push(...result.reasons.map((reason) => reason.code));
  else if (!confirmationPolicy) blockers.push("CONFIRMATIONS_REQUIRED");
  const snapshot = qualificationSnapshot(now, scan, observation, result.state);
  const progression = appendProgression(input.priorProgression, snapshot);
  const regressed = confirmationRegressed(progression);
  if (regressed) blockers.push("CONFIRMATION_REGRESSION_REVIEW_REQUIRED");
  const progressionProven =
    new Set(
      progression
        .map((item) => item.confirmations)
        .filter((item): item is number => item !== undefined),
    ).size >= 2;
  if (confirmationPolicy && !progressionProven)
    blockers.push("CONFIRMATION_PROGRESSION_REQUIRED");

  const verified =
    networkIdentity &&
    synchronized &&
    readOnlyAuthority &&
    exactAmountAndMemo &&
    confirmationPolicy &&
    progressionProven &&
    !regressed;
  return {
    schema: "obliq.public-testnet-qualification.v1",
    generatedAt: now.toISOString(),
    mode,
    classification: verified
      ? "PUBLIC_NETWORK_VERIFIED"
      : exactAmountAndMemo
        ? "PUBLIC_NETWORK_CONFIRMING"
        : "PUBLIC_NETWORK_FUNDED_TEST_BLOCKED",
    network: "testnet",
    observer: observerEvidence(scan),
    expectedPayment: expectedPayment(target),
    observation: {
      transactionReference: observation.txid,
      outputIndex: observation.outputIndex,
      pool: observation.pool,
      minedHeight: observation.minedHeight,
      confirmations: observation.confirmations,
      correlation: result.correlation,
      reconciliationState: result.state,
      reasons: result.reasons.map((reason) => reason.code),
    },
    progression,
    checks: {
      networkIdentity,
      synchronized,
      readOnlyAuthority,
      exactAmountAndMemo,
      confirmationPolicy,
    },
    blockers,
  };
}

function blockedFundedReport(
  input: BuildReportInput,
  blockers: readonly string[],
  checks: PublicTestnetQualificationReport["checks"],
): PublicTestnetQualificationReport {
  return {
    schema: "obliq.public-testnet-qualification.v1",
    generatedAt: (input.now ?? new Date()).toISOString(),
    mode: input.mode,
    classification: "PUBLIC_NETWORK_FUNDED_TEST_BLOCKED",
    network: "testnet",
    observer: observerEvidence(input.scan),
    ...(input.target ? { expectedPayment: expectedPayment(input.target) } : {}),
    progression: input.priorProgression ?? [],
    checks,
    blockers,
  };
}

function observerEvidence(scan: ObserverScanResult) {
  return {
    availability: scan.status.availability,
    authority:
      scan.status.authority === "UFVK_VIEW_ONLY"
        ? ("UFVK_VIEW_ONLY" as const)
        : ("UNPROVEN" as const),
    spendingAuthority:
      scan.status.spendingAuthority === false
        ? ("NONE" as const)
        : ("UNPROVEN" as const),
    ...(scan.status.chainTipHeight === undefined
      ? {}
      : { chainTipHeight: scan.status.chainTipHeight }),
    ...(scan.status.fullyScannedHeight === undefined
      ? {}
      : { fullyScannedHeight: scan.status.fullyScannedHeight }),
  };
}

function expectedPayment(target: ObservationTarget) {
  return {
    amountZat: target.expectedAmountZat.toString(),
    receiverFingerprint: target.receiverFingerprint,
    memoReferenceHash: target.memoReferenceHash,
    requiredConfirmations: target.requiredConfirmations,
  };
}

function qualificationSnapshot(
  now: Date,
  scan: ObserverScanResult,
  observation: NormalizedShieldedOutput,
  reconciliationState: string,
): QualificationSnapshot {
  return {
    observedAt: now.toISOString(),
    chainTipHeight: scan.status.chainTipHeight!,
    fullyScannedHeight: scan.status.fullyScannedHeight!,
    confirmations: observation.confirmations,
    reconciliationState,
  };
}

function appendProgression(
  prior: readonly QualificationSnapshot[] | undefined,
  next: QualificationSnapshot,
) {
  const progression = [...(prior ?? [])];
  const last = progression.at(-1);
  if (
    !last ||
    last.confirmations !== next.confirmations ||
    last.chainTipHeight !== next.chainTipHeight ||
    last.reconciliationState !== next.reconciliationState
  )
    progression.push(next);
  return progression;
}

function confirmationRegressed(progression: readonly QualificationSnapshot[]) {
  return progression.some(
    (snapshot, index) =>
      index > 0 &&
      snapshot.confirmations !== undefined &&
      progression[index - 1]?.confirmations !== undefined &&
      snapshot.confirmations < progression[index - 1]!.confirmations!,
  );
}

export function qualificationMemoHash(reference: string) {
  return memoReferenceHash(reference);
}
