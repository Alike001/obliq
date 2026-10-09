import { readFile } from "node:fs/promises";
import { assertPrivateRegularFile } from "@obliq/zcash/qualification-files";
import {
  offlineEvidenceValidatorExitCode,
  validateOperatorAssertedSignerEvidence,
  type OperatorAssertedSignerEvidence,
} from "@obliq/zcash/signer-preflight";

const evidenceFile = process.env.OBLIQ_TESTNET_OPERATOR_EVIDENCE_FILE;
if (!evidenceFile)
  throw new Error("OBLIQ_TESTNET_OPERATOR_EVIDENCE_FILE is required");
await assertPrivateRegularFile(
  evidenceFile,
  "Operator-asserted signer evidence file",
);
const input = parseInput(JSON.parse(await readFile(evidenceFile, "utf8")));
const report = validateOperatorAssertedSignerEvidence(input);
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
// A self-asserted summary never yields process success: exit 2 means the file
// is internally consistent but operationally untrusted; exit 1 means invalid.
process.exitCode = offlineEvidenceValidatorExitCode(report);

function parseInput(value: unknown): OperatorAssertedSignerEvidence {
  if (!value || typeof value !== "object")
    throw new Error("Signer preflight evidence is malformed");
  const item = value as Record<string, unknown>;
  const observer = object(item.observer, "observer");
  const zebra = object(item.zebra, "zebra");
  const zallet = object(item.zallet, "zallet");
  const rpc = object(item.rpc, "rpc");
  const methods = rpc.methods;
  if (
    !Array.isArray(methods) ||
    !methods.every((method) => typeof method === "string")
  )
    throw new Error("Signer preflight RPC methods are malformed");
  return {
    observer: {
      network: string(observer.network, "observer.network"),
      serviceChain: string(observer.serviceChain, "observer.serviceChain"),
      chainTipHeight: integer(
        observer.chainTipHeight,
        "observer.chainTipHeight",
      ),
      activeConsensusBranchId: string(
        observer.activeConsensusBranchId,
        "observer.activeConsensusBranchId",
      ),
      nu7ActivationHeight:
        observer.nu7ActivationHeight === null
          ? null
          : integer(
              observer.nu7ActivationHeight,
              "observer.nu7ActivationHeight",
            ),
      nu7Active: boolean(observer.nu7Active, "observer.nu7Active"),
      spendingAuthority: boolean(
        observer.spendingAuthority,
        "observer.spendingAuthority",
      ),
    },
    zebra: {
      version: string(zebra.version, "zebra.version"),
      sourceCommit: string(zebra.sourceCommit, "zebra.sourceCommit"),
      releaseAttestationVerified: boolean(
        zebra.releaseAttestationVerified,
        "zebra.releaseAttestationVerified",
      ),
    },
    zallet: {
      version: string(zallet.version, "zallet.version"),
      sourceCommit: string(zallet.sourceCommit, "zallet.sourceCommit"),
      binaryName: string(zallet.binaryName, "zallet.binaryName"),
      backend: string(zallet.backend, "zallet.backend"),
      archiveSha256: string(zallet.archiveSha256, "zallet.archiveSha256"),
    },
    rpc: {
      methods,
      pcztCreateProbe: enumeration(
        rpc.pcztCreateProbe,
        ["UNFUNDED_ACCOUNT", "METHOD_UNAVAILABLE"] as const,
        "rpc.pcztCreateProbe",
      ),
      pcztInspectProbe: enumeration(
        rpc.pcztInspectProbe,
        ["SAFE_FIXTURE_INSPECTED", "METHOD_UNAVAILABLE"] as const,
        "rpc.pcztInspectProbe",
      ),
      inspectedTxVersion:
        rpc.inspectedTxVersion === null
          ? null
          : integer(rpc.inspectedTxVersion, "rpc.inspectedTxVersion"),
      inspectedConsensusBranchId: nullableString(
        rpc.inspectedConsensusBranchId,
        "rpc.inspectedConsensusBranchId",
      ),
      inspectedPrivacyPolicy: nullableString(
        rpc.inspectedPrivacyPolicy,
        "rpc.inspectedPrivacyPolicy",
      ),
      provingAttempted: boolean(rpc.provingAttempted, "rpc.provingAttempted"),
      signingAttempted: boolean(rpc.signingAttempted, "rpc.signingAttempted"),
      broadcastAttempted: boolean(
        rpc.broadcastAttempted,
        "rpc.broadcastAttempted",
      ),
    },
  };
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0)
    throw new Error(`${label} must be a non-empty string`);
  return value;
}

function nullableString(value: unknown, label: string): string | null {
  if (value === null) return null;
  return string(value, label);
}

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    throw new Error(`${label} must be a non-negative integer`);
  return value as number;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${label} must be boolean`);
  return value;
}

function enumeration<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  label: string,
): T[number] {
  if (
    typeof value !== "string" ||
    !(allowed as readonly string[]).includes(value)
  )
    throw new Error(`${label} is invalid`);
  return value;
}
