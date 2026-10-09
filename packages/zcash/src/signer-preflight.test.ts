import { describe, expect, it } from "vitest";
import {
  evaluateUnfundedSignerPreflight,
  publicTestnetPins,
  type UnfundedSignerPreflightInput,
} from "./signer-preflight";

const validInput = (): UnfundedSignerPreflightInput => ({
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

describe("public-testnet signer preflight", () => {
  it("accepts an exact NU7, pinned, zallet-zaino unfunded preflight", () => {
    expect(evaluateUnfundedSignerPreflight(validInput())).toMatchObject({
      status: "PASS",
      classification: "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST",
      blockers: [],
    });
  });

  it("rejects the stale NU6.3 consensus branch after NU7 activation", () => {
    const input = validInput();
    input.observer.activeConsensusBranchId = "37a5165b";
    expect(evaluateUnfundedSignerPreflight(input)).toMatchObject({
      status: "BLOCKED",
      blockers: ["PREFLIGHT_CONSENSUS_BRANCH"],
    });
  });

  it("rejects a PCZT fixture bound to the stale NU6.3 branch", () => {
    const input = validInput();
    input.rpc.inspectedConsensusBranchId = "37a5165b";
    expect(evaluateUnfundedSignerPreflight(input)).toMatchObject({
      status: "BLOCKED",
      blockers: ["PREFLIGHT_PCZT_INSPECTION_MATCHES_NU7"],
    });
  });

  it("rejects the default zebra-state backend and unpinned artifacts", () => {
    const input = validInput();
    input.zallet.binaryName = "zallet-zebra";
    input.zallet.backend = "zebra";
    input.zallet.archiveSha256 = "00".repeat(32);
    const report = evaluateUnfundedSignerPreflight(input);
    expect(report.status).toBe("BLOCKED");
    expect(report.blockers).toContain("PREFLIGHT_ZALLET_PINNED");
    expect(report.blockers).toContain("PREFLIGHT_ZAINO_BACKEND");
  });

  it("cannot pass if proving, signing, or broadcast was attempted", () => {
    const input = validInput();
    input.rpc.signingAttempted = true;
    expect(evaluateUnfundedSignerPreflight(input)).toMatchObject({
      status: "BLOCKED",
      blockers: ["PREFLIGHT_NO_EXECUTION_ATTEMPT"],
    });
  });
});
