import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { describe, expect, it } from "vitest";
import {
  ProcessZcashAddressInspector,
  ProcessZcashObserver,
  parseAddressInspectionOutput,
} from "./server";
import type { ZcashAddressInspectionError } from "./server";

describe("address inspection evidence", () => {
  it("accepts only a structured valid result for the configured network", () => {
    expect(
      parseAddressInspectionOutput(
        JSON.stringify({
          status: "VALID",
          network: "testnet",
          orchardReceiverPresent: true,
          transparentReceiverPresent: false,
          receiverFingerprint: "ab".repeat(32),
        }),
        "testnet",
      ),
    ).toEqual({
      network: "testnet",
      orchardReceiverPresent: true,
      transparentReceiverPresent: false,
      receiverFingerprint: "ab".repeat(32),
    });
  });

  it("recognizes only the sidecar's exact sanitized invalid envelope", () => {
    expect(() =>
      parseAddressInspectionOutput(
        JSON.stringify({
          status: "INVALID",
          reasonCode: "ADDRESS_REJECTED",
        }),
        "testnet",
      ),
    ).toThrowError(
      expect.objectContaining<Partial<ZcashAddressInspectionError>>({
        code: "ADDRESS_REJECTED",
      }),
    );
    for (const ambiguous of [
      "not json",
      JSON.stringify({ status: "INVALID", reasonCode: "CRASH" }),
      JSON.stringify({
        status: "INVALID",
        reasonCode: "ADDRESS_REJECTED",
        diagnostic: "recipient material",
      }),
      JSON.stringify({
        status: "VALID",
        network: "mainnet",
        orchardReceiverPresent: true,
        transparentReceiverPresent: false,
        receiverFingerprint: "ab".repeat(32),
      }),
    ])
      expect(() =>
        parseAddressInspectionOutput(ambiguous, "testnet"),
      ).toThrowError(
        expect.objectContaining<Partial<ZcashAddressInspectionError>>({
          code: "MALFORMED_OUTPUT",
        }),
      );
  });

  it("terminates a hung inspector as unavailable, never invalid", async () => {
    const directory = await mkdtemp(join(tmpdir(), "obliq-inspector-"));
    const binary = join(directory, "hung-inspector");
    const pidFile = join(directory, "pid");
    await writeFile(
      binary,
      `#!/bin/sh\necho $$ > '${pidFile}'\nexec sleep 60\n`,
      { mode: 0o700 },
    );
    await chmod(binary, 0o700);
    try {
      const inspector = new ProcessZcashAddressInspector(
        binary,
        "testnet",
        100,
      );
      await expect(
        inspector.inspect("utest1-not-logged"),
      ).rejects.toMatchObject({
        code: "INSPECTOR_UNAVAILABLE",
        message: "Zcash address inspection failed",
      });

      const pid = Number.parseInt(await readFile(pidFile, "utf8"), 10);
      let stopped = false;
      for (let attempt = 0; attempt < 50; attempt += 1) {
        try {
          process.kill(pid, 0);
          await delay(10);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
          stopped = true;
          break;
        }
      }
      expect(stopped).toBe(true);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

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
