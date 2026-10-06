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
        viewingAuthority: "uviewregtest1sensitive",
      },
      (_file, _args, env) => {
        expect(Object.keys(env).sort()).toEqual([
          "OBSERVER_DB",
          "OBSERVER_ENDPOINT",
          "OBSERVER_UFVK",
        ]);
        expect(env.OBSERVER_UFVK).toBe("uviewregtest1sensitive");
        return Promise.resolve({
          stdout: JSON.stringify({
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

  it("maps infrastructure failure to unavailable without financial inference", async () => {
    const observer = new ProcessZcashObserver(
      {
        binary: "/safe/observer",
        databasePath: "/safe/wallet.sqlite",
        endpoint: "https://node.invalid",
        network: "regtest",
        viewingAuthority: "uviewregtest1sensitive",
      },
      () =>
        Promise.reject(new Error("transport failed uviewregtest1sensitive")),
    );
    expect(await observer.observe()).toEqual({
      status: {
        availability: "UNAVAILABLE",
        network: "regtest",
        reasonCode: "NODE_UNAVAILABLE",
      },
      observations: [],
    });
  });

  it("refuses unproved public-network operation", async () => {
    const observer = new ProcessZcashObserver(
      {
        binary: "/safe/observer",
        databasePath: "/safe/wallet.sqlite",
        endpoint: "https://node.invalid",
        network: "mainnet",
        viewingAuthority: "uview1sensitive",
      },
      () => Promise.reject(new Error("must not launch")),
    );
    expect(await observer.observe()).toEqual({
      status: {
        availability: "MISCONFIGURED",
        network: "mainnet",
        reasonCode: "PUBLIC_NETWORK_UNAVAILABLE",
      },
      observations: [],
    });
  });
});
