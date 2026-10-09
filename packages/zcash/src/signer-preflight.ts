export const publicTestnetPins = {
  network: "testnet",
  nu7ActivationHeight: 4_465_026,
  nu7ConsensusBranchId: "77190ad9",
  zebra: {
    version: "7.0.0-rc.0",
    sourceCommit: "6d1e414d6f55e4180d0e47baaa934bf97d5b4fec",
  },
  zallet: {
    version: "0.1.0-beta.3",
    sourceCommit: "987382f67e622915228686e9f956c6a9c9a7514c",
    linuxAmd64ArchiveSha256:
      "1df2398df016ae6e9a1cba3f8ef0cc86ca0d7b48a0934b34df6f68114ebe9306",
    linuxArm64ArchiveSha256:
      "8ccce997a4e89446ee7be214c603d955083bbe58d06ef11df20a970f81b139ac",
  },
} as const;

export interface OperatorAssertedSignerEvidence {
  observer: {
    network: string;
    serviceChain: string;
    chainTipHeight: number;
    activeConsensusBranchId: string;
    nu7ActivationHeight: number | null;
    nu7Active: boolean;
    spendingAuthority: boolean;
  };
  zebra: {
    version: string;
    sourceCommit: string;
    releaseAttestationVerified: boolean;
  };
  zallet: {
    version: string;
    sourceCommit: string;
    binaryName: string;
    backend: string;
    archiveSha256: string;
  };
  rpc: {
    methods: readonly string[];
    pcztCreateProbe: "UNFUNDED_ACCOUNT" | "METHOD_UNAVAILABLE";
    pcztInspectProbe: "SAFE_FIXTURE_INSPECTED" | "METHOD_UNAVAILABLE";
    inspectedTxVersion: number | null;
    inspectedConsensusBranchId: string | null;
    inspectedPrivacyPolicy: string | null;
    provingAttempted: boolean;
    signingAttempted: boolean;
    broadcastAttempted: boolean;
  };
}

export interface OfflineSignerEvidenceValidationReport {
  status: "CONSISTENT_UNTRUSTED" | "REJECTED";
  evidenceBoundary: "OPERATOR_ASSERTED_JSON";
  liveCompatibility: "UNVERIFIED";
  fundedCeremonyAuthorized: false;
  classification: "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST";
  expectedConsensusBranchId: string;
  checks: Record<string, boolean>;
  blockers: readonly string[];
  operationalBlockers: readonly ["INDEPENDENT_LIVE_RPC_EVIDENCE_REQUIRED"];
}

const requiredPcztMethods = ["pczt_create", "pczt_inspect"] as const;

/**
 * Validates the internal consistency of operator-authored JSON only.
 *
 * This function does not contact Zebra or Zallet, authenticate an RPC peer,
 * inspect a PCZT, or establish provenance. Its result can never authorize a
 * funded ceremony.
 */
export function validateOperatorAssertedSignerEvidence(
  input: OperatorAssertedSignerEvidence,
): OfflineSignerEvidenceValidationReport {
  const expectedZalletHashes = new Set<string>([
    publicTestnetPins.zallet.linuxAmd64ArchiveSha256,
    publicTestnetPins.zallet.linuxArm64ArchiveSha256,
  ]);
  const checks = {
    networkIdentity:
      input.observer.network === publicTestnetPins.network &&
      input.observer.serviceChain === "test",
    nu7Active:
      input.observer.nu7Active &&
      input.observer.chainTipHeight >= publicTestnetPins.nu7ActivationHeight &&
      input.observer.nu7ActivationHeight ===
        publicTestnetPins.nu7ActivationHeight,
    consensusBranch:
      input.observer.activeConsensusBranchId.toLowerCase() ===
      publicTestnetPins.nu7ConsensusBranchId,
    observerCannotSpend: input.observer.spendingAuthority === false,
    zebraPinned:
      input.zebra.version === publicTestnetPins.zebra.version &&
      input.zebra.sourceCommit === publicTestnetPins.zebra.sourceCommit &&
      input.zebra.releaseAttestationVerified,
    zalletPinned:
      input.zallet.version === publicTestnetPins.zallet.version &&
      input.zallet.sourceCommit === publicTestnetPins.zallet.sourceCommit &&
      expectedZalletHashes.has(input.zallet.archiveSha256),
    zainoBackend:
      input.zallet.binaryName === "zallet-zaino" &&
      input.zallet.backend === "zaino",
    pcztRpcSurface: requiredPcztMethods.every((method) =>
      input.rpc.methods.includes(method),
    ),
    pcztCreateReached: input.rpc.pcztCreateProbe === "UNFUNDED_ACCOUNT",
    pcztInspectReached: input.rpc.pcztInspectProbe === "SAFE_FIXTURE_INSPECTED",
    pcztInspectionMatchesNu7:
      input.rpc.inspectedTxVersion === 6 &&
      input.rpc.inspectedConsensusBranchId?.toLowerCase() ===
        publicTestnetPins.nu7ConsensusBranchId &&
      input.rpc.inspectedPrivacyPolicy === "FullPrivacy",
    noExecutionAttempt:
      !input.rpc.provingAttempted &&
      !input.rpc.signingAttempted &&
      !input.rpc.broadcastAttempted,
  };
  const blockers = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(
      ([name]) =>
        `PREFLIGHT_${name.replace(/[A-Z]/gu, (c) => `_${c}`).toUpperCase()}`,
    );
  return {
    status: blockers.length === 0 ? "CONSISTENT_UNTRUSTED" : "REJECTED",
    evidenceBoundary: "OPERATOR_ASSERTED_JSON",
    liveCompatibility: "UNVERIFIED",
    fundedCeremonyAuthorized: false,
    classification: "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST",
    expectedConsensusBranchId: publicTestnetPins.nu7ConsensusBranchId,
    checks,
    blockers,
    operationalBlockers: ["INDEPENDENT_LIVE_RPC_EVIDENCE_REQUIRED"],
  };
}

/** Offline assertions deliberately never return a successful process code. */
export function offlineEvidenceValidatorExitCode(
  report: OfflineSignerEvidenceValidationReport,
): 1 | 2 {
  return report.status === "REJECTED" ? 1 : 2;
}
