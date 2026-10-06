import { createHash } from "node:crypto";

export type DeploymentMode = "development" | "production" | "test";
export type AuthMode = "development" | "oidc";
export type StorageMode = "local-development" | "s3-private";
export type PublicNetworkStatus =
  | "PUBLIC_NETWORK_BLOCKED"
  | "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST"
  | "PUBLIC_NETWORK_VERIFIED";
export type RuntimeNetwork = "regtest" | "testnet" | "mainnet";

export interface RuntimeSecurityConfig {
  deploymentMode: DeploymentMode;
  authMode: AuthMode;
  storageMode: StorageMode;
  rateLimitMode: "postgresql";
  network: RuntimeNetwork;
  observerNetwork: RuntimeNetwork;
  publicNetworkStatus: PublicNetworkStatus;
}

function required(env: NodeJS.ProcessEnv, name: string) {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Required runtime setting is missing: ${name}`);
  return value;
}

function httpsUrl(value: string, name: string) {
  const url = new URL(value);
  if (url.protocol !== "https:")
    throw new Error(`${name} must use HTTPS in production`);
}

function network(value: string | undefined, name: string): RuntimeNetwork {
  if (value === "regtest" || value === "testnet" || value === "mainnet")
    return value;
  throw new Error(`${name} must be regtest, testnet, or mainnet`);
}

export function parseRuntimeSecurityConfig(
  env: NodeJS.ProcessEnv,
): RuntimeSecurityConfig {
  const deploymentMode =
    env.OBLIQ_DEPLOYMENT_MODE ??
    (env.NODE_ENV === "production" ? "production" : "development");
  if (
    !(["development", "production", "test"] as const).includes(
      deploymentMode as DeploymentMode,
    )
  )
    throw new Error("OBLIQ_DEPLOYMENT_MODE is invalid");
  const authMode = env.OBLIQ_SESSION_MODE;
  if (authMode !== "development" && authMode !== "oidc")
    throw new Error("OBLIQ_SESSION_MODE must be development or oidc");
  const storageMode = env.OBLIQ_STORAGE_MODE ?? "local-development";
  if (storageMode !== "local-development" && storageMode !== "s3-private")
    throw new Error("OBLIQ_STORAGE_MODE is invalid");
  const selectedNetwork = network(
    env.OBLIQ_ZCASH_NETWORK ?? "regtest",
    "OBLIQ_ZCASH_NETWORK",
  );
  const observerNetwork = network(
    env.OBSERVER_NETWORK ?? "regtest",
    "OBSERVER_NETWORK",
  );
  if (selectedNetwork !== observerNetwork)
    throw new Error("Zcash application and observer networks do not match");
  const publicNetworkStatus =
    env.OBLIQ_PUBLIC_NETWORK_STATUS ?? "PUBLIC_NETWORK_BLOCKED";
  if (
    ![
      "PUBLIC_NETWORK_BLOCKED",
      "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST",
      "PUBLIC_NETWORK_VERIFIED",
    ].includes(publicNetworkStatus)
  )
    throw new Error("OBLIQ_PUBLIC_NETWORK_STATUS is invalid");
  if (publicNetworkStatus !== "PUBLIC_NETWORK_BLOCKED")
    throw new Error(
      "This release cannot claim public-network readiness without a code change",
    );
  if (
    selectedNetwork !== "regtest" &&
    publicNetworkStatus === "PUBLIC_NETWORK_BLOCKED"
  )
    throw new Error("Public Zcash network is blocked by runtime policy");

  if (deploymentMode === "production") {
    if (authMode !== "oidc")
      throw new Error("Production requires OIDC authentication");
    if (storageMode !== "s3-private")
      throw new Error("Production requires private object storage");
    httpsUrl(required(env, "OBLIQ_APP_BASE_URL"), "OBLIQ_APP_BASE_URL");
    httpsUrl(required(env, "OIDC_ISSUER"), "OIDC_ISSUER");
    required(env, "OIDC_CLIENT_ID");
    required(env, "OIDC_CLIENT_SECRET");
    required(env, "DATABASE_URL");
    if (required(env, "OBLIQ_SESSION_PEPPER").length < 32)
      throw new Error(
        "OBLIQ_SESSION_PEPPER must contain at least 32 characters",
      );
    required(env, "OBLIQ_STORAGE_BUCKET");
    required(env, "OBLIQ_STORAGE_REGION");
    httpsUrl(
      required(env, "OBLIQ_DOCUMENT_SCANNER_URL"),
      "OBLIQ_DOCUMENT_SCANNER_URL",
    );
    if (required(env, "OBLIQ_DOCUMENT_SCANNER_TOKEN").length < 20)
      throw new Error("OBLIQ_DOCUMENT_SCANNER_TOKEN is too short");
  }
  return {
    deploymentMode: deploymentMode as DeploymentMode,
    authMode,
    storageMode,
    rateLimitMode: "postgresql",
    network: selectedNetwork,
    observerNetwork,
    publicNetworkStatus,
  };
}

const sensitiveKey =
  /(?:authorization|cookie|document|memo|mnemonic|passphrase|password|pczt|private|rawtransaction|receiver|seed|secret|session|signedtx|spend|token|ufvk|uivk|viewing)/iu;
const secretValue =
  /(?:uview(?:regtest|test)?1[a-z0-9]*|postgres(?:ql)?:\/\/[^\s]+|-----BEGIN [A-Z ]*PRIVATE KEY-----|seed phrase|spending key|private key|bearer\s+[a-z0-9._~-]+)/giu;

export function redactOperationalValue(value: unknown): unknown {
  if (typeof value === "string")
    return value.replace(secretValue, "[REDACTED]");
  if (Array.isArray(value)) return value.map(redactOperationalValue);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        sensitiveKey.test(key) ? "[REDACTED]" : redactOperationalValue(item),
      ]),
    );
  return value;
}

export function operationalFingerprint(value: string, pepper: string) {
  return createHash("sha256")
    .update(pepper)
    .update("\0")
    .update(value)
    .digest("hex");
}

export function isAllowedMutationOrigin(
  requestOrigin: string | null,
  applicationBaseUrl: string,
) {
  if (!requestOrigin) return false;
  try {
    return new URL(requestOrigin).origin === new URL(applicationBaseUrl).origin;
  } catch {
    return false;
  }
}

export function writeOperationalLog(
  level: "info" | "warn" | "error",
  event: string,
  context: Record<string, unknown> = {},
) {
  const sanitized = redactOperationalValue(context) as Record<string, unknown>;
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...sanitized,
  });
  if (level === "error") process.stderr.write(`${entry}\n`);
  else process.stdout.write(`${entry}\n`);
}
