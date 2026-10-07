import { describe, expect, it } from "vitest";
import {
  operationalFingerprint,
  isAllowedMutationOrigin,
  parseRuntimeSecurityConfig,
  redactOperationalValue,
} from "./index";

describe("runtime security configuration", () => {
  it("keeps explicit development mode separate", () => {
    expect(
      parseRuntimeSecurityConfig({
        NODE_ENV: "development",
        OBLIQ_SESSION_MODE: "development",
        OBLIQ_ZCASH_NETWORK: "regtest",
        OBSERVER_NETWORK: "regtest",
      }).authMode,
    ).toBe("development");
  });

  it("fails production closed without OIDC and private storage", () => {
    expect(() =>
      parseRuntimeSecurityConfig({
        NODE_ENV: "production",
        OBLIQ_DEPLOYMENT_MODE: "production",
        OBLIQ_SESSION_MODE: "development",
      }),
    ).toThrow("Production requires OIDC");
  });

  it("accepts a complete production boundary without returning secrets", () => {
    const config = parseRuntimeSecurityConfig({
      NODE_ENV: "production",
      OBLIQ_DEPLOYMENT_MODE: "production",
      OBLIQ_SESSION_MODE: "oidc",
      OBLIQ_STORAGE_MODE: "s3-private",
      OBLIQ_ZCASH_NETWORK: "regtest",
      OBSERVER_NETWORK: "regtest",
      DATABASE_URL: "postgresql://private",
      OBLIQ_APP_BASE_URL: "https://app.obliq.example",
      OIDC_ISSUER: "https://identity.example",
      OIDC_CLIENT_ID: "obliq",
      OIDC_CLIENT_SECRET: "client-secret",
      OBLIQ_SESSION_PEPPER: "p".repeat(32),
      OBLIQ_STORAGE_BUCKET: "obliq-private",
      OBLIQ_STORAGE_REGION: "test-region-1",
      OBLIQ_DOCUMENT_SCANNER_URL: "https://scanner.example/scan",
      OBLIQ_DOCUMENT_SCANNER_TOKEN: "s".repeat(24),
    });
    expect(config).toEqual({
      deploymentMode: "production",
      authMode: "oidc",
      storageMode: "s3-private",
      rateLimitMode: "postgresql",
      network: "regtest",
      observerNetwork: "regtest",
      publicNetworkStatus: "PUBLIC_NETWORK_BLOCKED",
    });
    expect(JSON.stringify(config)).not.toContain("client-secret");
  });

  it("accepts a database-free public preview with every private runtime disabled", () => {
    expect(
      parseRuntimeSecurityConfig({
        NODE_ENV: "production",
        OBLIQ_DEPLOYMENT_MODE: "preview",
        OBLIQ_SESSION_MODE: "disabled",
        OBLIQ_STORAGE_MODE: "disabled",
        OBLIQ_ZCASH_NETWORK: "disabled",
        OBSERVER_NETWORK: "disabled",
        OBLIQ_PUBLIC_NETWORK_STATUS: "PUBLIC_NETWORK_BLOCKED",
        OBLIQ_APP_BASE_URL: "https://obliq-preview.onrender.com",
      }),
    ).toEqual({
      deploymentMode: "preview",
      authMode: "disabled",
      storageMode: "disabled",
      rateLimitMode: "disabled",
      network: "disabled",
      observerNetwork: "disabled",
      publicNetworkStatus: "PUBLIC_NETWORK_BLOCKED",
    });
  });

  it("fails public preview closed if a private dependency or secret is configured", () => {
    const preview = {
      NODE_ENV: "production",
      OBLIQ_DEPLOYMENT_MODE: "preview",
      OBLIQ_SESSION_MODE: "disabled",
      OBLIQ_STORAGE_MODE: "disabled",
      OBLIQ_ZCASH_NETWORK: "disabled",
      OBSERVER_NETWORK: "disabled",
      OBLIQ_PUBLIC_NETWORK_STATUS: "PUBLIC_NETWORK_BLOCKED",
      OBLIQ_APP_BASE_URL: "https://obliq-preview.onrender.com",
    };
    expect(() =>
      parseRuntimeSecurityConfig({ ...preview, DATABASE_URL: "postgres://db" }),
    ).toThrow("must not configure DATABASE_URL");
    expect(() =>
      parseRuntimeSecurityConfig({ ...preview, OBSERVER_UFVK: "secret" }),
    ).toThrow("must not configure OBSERVER_UFVK");
    expect(() =>
      parseRuntimeSecurityConfig({
        ...preview,
        OBLIQ_SESSION_MODE: "development",
      }),
    ).toThrow("requires authentication to be disabled");
    expect(() =>
      parseRuntimeSecurityConfig({
        ...preview,
        OBLIQ_ZCASH_NETWORK: "regtest",
      }),
    ).toThrow("do not match");
  });

  it("fails on network mismatch or an unqualified public network", () => {
    expect(() =>
      parseRuntimeSecurityConfig({
        NODE_ENV: "test",
        OBLIQ_SESSION_MODE: "development",
        OBLIQ_ZCASH_NETWORK: "mainnet",
        OBSERVER_NETWORK: "testnet",
      }),
    ).toThrow("do not match");
    expect(() =>
      parseRuntimeSecurityConfig({
        NODE_ENV: "test",
        OBLIQ_SESSION_MODE: "development",
        OBLIQ_ZCASH_NETWORK: "mainnet",
        OBSERVER_NETWORK: "mainnet",
        OBLIQ_PUBLIC_NETWORK_STATUS: "PUBLIC_NETWORK_BLOCKED",
      }),
    ).toThrow("blocked");
    expect(() =>
      parseRuntimeSecurityConfig({
        NODE_ENV: "test",
        OBLIQ_SESSION_MODE: "development",
        OBLIQ_ZCASH_NETWORK: "mainnet",
        OBSERVER_NETWORK: "mainnet",
        OBLIQ_PUBLIC_NETWORK_STATUS: "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST",
      }),
    ).toThrow("Mainnet remains blocked");
    expect(() =>
      parseRuntimeSecurityConfig({
        NODE_ENV: "test",
        OBLIQ_SESSION_MODE: "development",
        OBLIQ_ZCASH_NETWORK: "testnet",
        OBSERVER_NETWORK: "testnet",
        OBLIQ_PUBLIC_NETWORK_STATUS: "PUBLIC_NETWORK_VERIFIED",
      }),
    ).toThrow("has not verified");
  });

  it("allows an explicitly qualified testnet observer without claiming verification", () => {
    expect(
      parseRuntimeSecurityConfig({
        NODE_ENV: "test",
        OBLIQ_SESSION_MODE: "development",
        OBLIQ_ZCASH_NETWORK: "testnet",
        OBSERVER_NETWORK: "testnet",
        OBLIQ_PUBLIC_NETWORK_STATUS: "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST",
      }),
    ).toMatchObject({
      network: "testnet",
      observerNetwork: "testnet",
      publicNetworkStatus: "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST",
    });
  });
});

describe("mutation origin validation", () => {
  it("accepts only the configured origin", () => {
    expect(
      isAllowedMutationOrigin(
        "https://app.obliq.example",
        "https://app.obliq.example/path",
      ),
    ).toBe(true);
    expect(
      isAllowedMutationOrigin(
        "https://attacker.example",
        "https://app.obliq.example",
      ),
    ).toBe(false);
    expect(isAllowedMutationOrigin(null, "https://app.obliq.example")).toBe(
      false,
    );
  });
});

describe("operational redaction", () => {
  it("redacts keys and embedded viewing authority", () => {
    const sanitized = redactOperationalValue({
      organizationId: "org-safe",
      sessionToken: "token-value",
      error: "failed for uviewregtest1sensitive",
      databaseError: "connect postgresql://user:password@db.internal/obliq",
      nested: { memoReference: "opaque" },
    });
    expect(JSON.stringify(sanitized)).not.toContain("token-value");
    expect(JSON.stringify(sanitized)).not.toContain("uviewregtest1sensitive");
    expect(JSON.stringify(sanitized)).not.toContain("opaque");
    expect(JSON.stringify(sanitized)).not.toContain("password@db");
    expect(JSON.stringify(sanitized)).toContain("org-safe");
  });

  it("creates stable non-reversible operational fingerprints", () => {
    expect(operationalFingerprint("subject", "pepper")).toBe(
      operationalFingerprint("subject", "pepper"),
    );
    expect(operationalFingerprint("subject", "pepper")).not.toContain(
      "subject",
    );
  });
});
