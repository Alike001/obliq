import { describe, expect, it } from "vitest";
import { ProcessZcashObserver } from "./server";

describe("process observer adapter", () => {
  it("normalizes sidecar output without returning receiver or viewing authority", async () => {
    const observer = new ProcessZcashObserver(
      {
        binary: "/safe/observer",
        databasePath: "/safe/wallet.sqlite",
        endpoint: "https://node.invalid",
        network: "regtest",
      },
      (_file, _args, env) => {
        expect(Object.keys(env).sort()).toEqual([
          "OBSERVER_DB",
          "OBSERVER_ENDPOINT",
          "OBSERVER_NETWORK",
        ]);
        expect(env.OBSERVER_NETWORK).toBe("regtest");
        expect(env).not.toHaveProperty("OBSERVER_UFVK");
        return Promise.resolve({
          stdout: JSON.stringify({
            network: "regtest",
            authority: "UFVK_VIEW_ONLY",
            spendingAuthority: false,
            chainTipHeight: 117,
            fullyScannedHeight: 117,
            synced: true,
            observations: [
              {
                txid: "ab".repeat(32),
                outputIndex: 1,
                pool: "IRONWOOD",
                amountZat: "125000000",
                memoReference: "obliq:v1:opaque",
                minedHeight: 115,
                confirmations: 3,
                receiver: "uregtest1private",
              },
            ],
          }),
        });
      },
    );
    const result = await observer.observe();
    expect(result.status.availability).toBe("AVAILABLE");
    expect(result.observations[0]).not.toHaveProperty("receiver");
    expect(result.observations[0]?.receiverFingerprint).not.toContain(
      "uregtest1private",
    );
    expect(result.status).not.toHaveProperty("viewingAuthority");
  });

  it("fails closed when sidecar network identity differs", async () => {
    const observer = new ProcessZcashObserver(
      {
        binary: "/safe/observer",
        databasePath: "/safe/wallet.sqlite",
        endpoint: "https://node.invalid",
        network: "regtest",
      },
      () =>
        Promise.resolve({
          stdout: JSON.stringify({
            network: "mainnet",
            authority: "UFVK_VIEW_ONLY",
            spendingAuthority: false,
            chainTipHeight: 1,
            fullyScannedHeight: 1,
            synced: true,
            observations: [],
          }),
        }),
    );
    expect((await observer.observe()).status).toMatchObject({
      availability: "UNAVAILABLE",
      reasonCode: "NETWORK_MISMATCH",
    });
  });

  it("maps infrastructure failure to unavailable without financial inference", async () => {
    const observer = new ProcessZcashObserver(
      {
        binary: "/safe/observer",
        databasePath: "/safe/wallet.sqlite",
        endpoint: "https://node.invalid",
        network: "regtest",
      },
      () =>
        Promise.reject(new Error("transport failed uviewregtest1sensitive")),
    );
    expect(await observer.observe()).toEqual({
      status: {
        availability: "UNAVAILABLE",
        network: "regtest",
        authority: "UFVK_VIEW_ONLY",
        spendingAuthority: false,
        reasonCode: "NODE_UNAVAILABLE",
      },
      observations: [],
    });
  });

  it("accepts public output only when the sidecar reports the configured network", async () => {
    const observer = new ProcessZcashObserver(
      {
        binary: "/safe/observer",
        databasePath: "/safe/wallet.sqlite",
        endpoint: "https://node.invalid",
        network: "mainnet",
      },
      (_file, _args, env) => {
        expect(env.OBSERVER_NETWORK).toBe("mainnet");
        return Promise.resolve({
          stdout: JSON.stringify({
            network: "mainnet",
            authority: "UFVK_VIEW_ONLY",
            spendingAuthority: false,
            chainTipHeight: 3_508_826,
            fullyScannedHeight: 3_508_826,
            synced: true,
            observations: [],
          }),
        });
      },
    );
    expect((await observer.observe()).status).toMatchObject({
      availability: "AVAILABLE",
      network: "mainnet",
    });
  });

  it("rejects output that does not prove a view-only authority and sane heights", async () => {
    const observer = new ProcessZcashObserver(
      {
        binary: "/safe/observer",
        databasePath: "/safe/wallet.sqlite",
        endpoint: "https://node.invalid",
        network: "testnet",
      },
      () =>
        Promise.resolve({
          stdout: JSON.stringify({
            network: "testnet",
            authority: "SPEND_CAPABLE",
            spendingAuthority: false,
            chainTipHeight: 100,
            fullyScannedHeight: 101,
            synced: true,
            observations: [],
          }),
        }),
    );
    expect((await observer.observe()).status).toMatchObject({
      availability: "UNAVAILABLE",
      reasonCode: "MALFORMED_OBSERVER_OUTPUT",
    });
  });
});
