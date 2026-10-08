import { describe, expect, it } from "vitest";
import { networkClaims, networkSummary } from "./network-claims";

const labels = (...args: Parameters<typeof networkClaims>) =>
  Object.fromEntries(networkClaims(...args).map((c) => [c.id, c.label]));

describe("network claims", () => {
  it("claims regtest only while the public network is blocked", () => {
    expect(labels("PUBLIC_NETWORK_BLOCKED", "regtest")).toEqual({
      regtest: "Verified",
      "testnet-sync": "Blocked",
      "public-settlement": "Not verified",
      mainnet: "Blocked",
    });
    expect(networkSummary("PUBLIC_NETWORK_BLOCKED")).toEqual({
      lead: "Shielded settlement is verified on regtest only.",
      rest: "Public-network operation is blocked.",
    });
  });

  it("keeps funded settlement unverified and mainnet blocked when testnet is ready for a funded test", () => {
    expect(labels("PUBLIC_NETWORK_READY_FOR_FUNDED_TEST", "testnet")).toEqual({
      regtest: "Verified",
      "testnet-sync": "Ready for funded test",
      "public-settlement": "Not verified",
      mainnet: "Blocked",
    });
    const summary = networkSummary("PUBLIC_NETWORK_READY_FOR_FUNDED_TEST");
    expect(summary.lead).toMatch(/regtest only/);
    expect(summary.rest).toMatch(/not verified and mainnet is blocked/);
  });

  it("marks the regtest claim, and only that claim, with the regtest scope", () => {
    for (const status of [
      "PUBLIC_NETWORK_BLOCKED",
      "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST",
      "PUBLIC_NETWORK_VERIFIED",
    ] as const) {
      const scoped = networkClaims(status, "testnet").filter((c) => c.scope);
      expect(scoped.map((c) => c.id)).toEqual(["regtest"]);
    }
  });

  it("does not extend a testnet verification to mainnet", () => {
    expect(labels("PUBLIC_NETWORK_VERIFIED", "testnet").mainnet).toBe(
      "Blocked",
    );
    expect(labels("PUBLIC_NETWORK_VERIFIED", "mainnet").mainnet).toBe(
      "Verified",
    );
  });
});
