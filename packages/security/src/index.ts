import { createHash } from "node:crypto";

export type DeploymentMode = "development" | "preview" | "production" | "test";
export type AuthMode = "development" | "disabled" | "oidc";
export type StorageMode = "disabled" | "local-development" | "s3-private";
export type PublicNetworkStatus =
  | "PUBLIC_NETWORK_BLOCKED"
  | "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST"
  | "PUBLIC_NETWORK_VERIFIED";
export type RuntimeNetwork = "disabled" | "regtest" | "testnet" | "mainnet";

export interface RuntimeSecurityConfig {
  deploymentMode: DeploymentMode;
  authMode: AuthMode;
  storageMode: StorageMode;
  rateLimitMode: "disabled" | "postgresql";
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
  if (
    value === "disabled" ||
    value === "regtest" ||
    value === "testnet" ||
    value === "mainnet"
  )
    return value;
  throw new Error(`${name} must be disabled, regtest, testnet, or mainnet`);
}

function rejectPreviewSecret(env: NodeJS.ProcessEnv, name: string) {
  if (env[name]?.trim())
    throw new Error(`Public preview must not configure ${name}`);
}

export function parseRuntimeSecurityConfig(
  env: NodeJS.ProcessEnv,
): RuntimeSecurityConfig {
  const deploymentMode =
    env.OBLIQ_DEPLOYMENT_MODE ??
    (env.NODE_ENV === "production" ? "production" : "development");
  if (
    !(["development", "preview", "production", "test"] as const).includes(
      deploymentMode as DeploymentMode,
    )
  )
    throw new Error("OBLIQ_DEPLOYMENT_MODE is invalid");
  const authMode = env.OBLIQ_SESSION_MODE;
  if (
    authMode !== "development" &&
    authMode !== "disabled" &&
    authMode !== "oidc"
  )
    throw new Error(
      "OBLIQ_SESSION_MODE must be development, disabled, or oidc",
    );
  const storageMode = env.OBLIQ_STORAGE_MODE ?? "local-development";
  if (
    storageMode !== "disabled" &&
    storageMode !== "local-development" &&
    storageMode !== "s3-private"
  )
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
    publicNetworkStatus !== "PUBLIC_NETWORK_BLOCKED" &&
    publicNetworkStatus !== "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST" &&
    publicNetworkStatus !== "PUBLIC_NETWORK_VERIFIED"
  )
    throw new Error("OBLIQ_PUBLIC_NETWORK_STATUS is invalid");
  if (
    selectedNetwork !== "regtest" &&
    selectedNetwork !== "disabled" &&
    publicNetworkStatus === "PUBLIC_NETWORK_BLOCKED"
  )
    throw new Error("Public Zcash network is blocked by runtime policy");
  if (publicNetworkStatus === "PUBLIC_NETWORK_VERIFIED")
    throw new Error("This release has not verified public-network settlement");
  if (selectedNetwork === "mainnet")
    throw new Error(
      "Mainnet remains blocked pending public-network verification",
    );

  if (deploymentMode === "preview") {
    if (authMode !== "disabled")
      throw new Error("Public preview requires authentication to be disabled");
    if (storageMode !== "disabled")
      throw new Error("Public preview requires storage to be disabled");
    if (selectedNetwork !== "disabled" || observerNetwork !== "disabled")
      throw new Error("Public preview requires Zcash runtimes to be disabled");
    if (publicNetworkStatus !== "PUBLIC_NETWORK_BLOCKED")
      throw new Error("Public preview cannot claim public-network readiness");
    httpsUrl(required(env, "OBLIQ_APP_BASE_URL"), "OBLIQ_APP_BASE_URL");
    [
      "DATABASE_URL",
      "OBSERVER_BINARY",
      "OBSERVER_DB",
      "OBSERVER_ENDPOINT",
      "OBSERVER_UFVK",
      "OIDC_CLIENT_ID",
      "OIDC_ISSUER",
      "OIDC_CLIENT_SECRET",
      "OBLIQ_DEV_ORGANIZATION_ID",
      "OBLIQ_DEV_USER_ID",
      "OBLIQ_DOCUMENT_SCANNER_URL",
      "OBLIQ_DOCUMENT_SCANNER_TOKEN",
      "OBLIQ_SESSION_PEPPER",
      "OBLIQ_STORAGE_BUCKET",
      "OBLIQ_STORAGE_ENDPOINT",
      "OBLIQ_STORAGE_KMS_KEY_ID",
      "OBLIQ_STORAGE_REGION",
    ].forEach((name) => rejectPreviewSecret(env, name));
  } else if (
    authMode === "disabled" ||
    storageMode === "disabled" ||
    selectedNetwork === "disabled" ||
    observerNetwork === "disabled"
  ) {
    throw new Error(
      "Disabled runtime components are exclusive to public preview",
    );
  }

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
    rateLimitMode: deploymentMode === "preview" ? "disabled" : "postgresql",
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
