import { describe, expect, it } from "vitest";
import {
  offlineEvidenceValidatorExitCode,
  publicTestnetPins,
  validateOperatorAssertedSignerEvidence,
  type OperatorAssertedSignerEvidence,
} from "./signer-preflight";

const validInput = (): OperatorAssertedSignerEvidence => ({
  observer: {
    network: "testnet",
    serviceChain: "test",
    chainTipHeight: 4_474_328,
    activeConsensusBranchId: publicTestnetPins.nu7ConsensusBranchId,
    nu7ActivationHeight: publicTestnetPins.nu7ActivationHeight,
    nu7Active: true,
    spendingAuthority: false,
  },
  zebra: {
    version: publicTestnetPins.zebra.version,
    sourceCommit: publicTestnetPins.zebra.sourceCommit,
    releaseAttestationVerified: true,
  },
  zallet: {
    version: publicTestnetPins.zallet.version,
    sourceCommit: publicTestnetPins.zallet.sourceCommit,
    binaryName: "zallet-zaino",
    backend: "zaino",
    archiveSha256: publicTestnetPins.zallet.linuxAmd64ArchiveSha256,
  },
  rpc: {
    methods: ["pczt_create", "pczt_inspect"],
    pcztCreateProbe: "UNFUNDED_ACCOUNT",
    pcztInspectProbe: "SAFE_FIXTURE_INSPECTED",
    inspectedTxVersion: 6,
    inspectedConsensusBranchId: "77190ad9",
    inspectedPrivacyPolicy: "FullPrivacy",
    provingAttempted: false,
    signingAttempted: false,
    broadcastAttempted: false,
  },
});

describe("offline public-testnet signer evidence validation", () => {
  it("validates internally consistent NU7 zallet-zaino assertions without treating them as live evidence", () => {
    expect(validateOperatorAssertedSignerEvidence(validInput())).toMatchObject({
      status: "CONSISTENT_UNTRUSTED",
      evidenceBoundary: "OPERATOR_ASSERTED_JSON",
      liveCompatibility: "UNVERIFIED",
      fundedCeremonyAuthorized: false,
      classification: "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST",
      blockers: [],
      operationalBlockers: ["INDEPENDENT_LIVE_RPC_EVIDENCE_REQUIRED"],
    });
  });

  it("does not authorize funding from fabricated but schema-valid assertions", () => {
    const fabricated = validInput();
    const report = validateOperatorAssertedSignerEvidence(fabricated);
    expect(report.status).toBe("CONSISTENT_UNTRUSTED");
    expect(report.fundedCeremonyAuthorized).toBe(false);
    expect(report.liveCompatibility).toBe("UNVERIFIED");
    expect(report.operationalBlockers).toContain(
      "INDEPENDENT_LIVE_RPC_EVIDENCE_REQUIRED",
    );
    expect(offlineEvidenceValidatorExitCode(report)).toBe(2);
    expect(offlineEvidenceValidatorExitCode(report)).not.toBe(0);
  });

  it("rejects the stale NU6.3 consensus branch after NU7 activation", () => {
    const input = validInput();
    input.observer.activeConsensusBranchId = "37a5165b";
    const report = validateOperatorAssertedSignerEvidence(input);
    expect(report).toMatchObject({
      status: "REJECTED",
      blockers: ["PREFLIGHT_CONSENSUS_BRANCH"],
    });
    expect(offlineEvidenceValidatorExitCode(report)).toBe(1);
  });

  it("rejects a PCZT fixture bound to the stale NU6.3 branch", () => {
    const input = validInput();
    input.rpc.inspectedConsensusBranchId = "37a5165b";
    expect(validateOperatorAssertedSignerEvidence(input)).toMatchObject({
      status: "REJECTED",
      blockers: ["PREFLIGHT_PCZT_INSPECTION_MATCHES_NU7"],
    });
  });

  it("rejects the default zebra-state backend and unpinned artifacts", () => {
    const input = validInput();
    input.zallet.binaryName = "zallet-zebra";
    input.zallet.backend = "zebra";
    input.zallet.archiveSha256 = "00".repeat(32);
    const report = validateOperatorAssertedSignerEvidence(input);
    expect(report.status).toBe("REJECTED");
    expect(report.blockers).toContain("PREFLIGHT_ZALLET_PINNED");
    expect(report.blockers).toContain("PREFLIGHT_ZAINO_BACKEND");
  });

  it("cannot pass if proving, signing, or broadcast was attempted", () => {
    const input = validInput();
    input.rpc.signingAttempted = true;
    expect(validateOperatorAssertedSignerEvidence(input)).toMatchObject({
      status: "REJECTED",
      blockers: ["PREFLIGHT_NO_EXECUTION_ATTEMPT"],
    });
  });
});
