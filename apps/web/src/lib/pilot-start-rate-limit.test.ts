import { RateLimitExceededError } from "@obliq/database";
import { describe, expect, it } from "vitest";
import {
  enforcePilotStartRateLimits,
  pilotRateLimitResponse,
  pilotStartRateLimits,
} from "./pilot-start-rate-limit";

function memoryLimiter() {
  const counts = new Map<string, number>();
  const consume = (scope: string, subject: string, limit: number) => {
    const key = `${scope}:${subject}`;
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    if (count > limit) throw new RateLimitExceededError(900, scope);
    return Promise.resolve();
  };
  return { counts, consume };
}

describe("pilot workspace start rate limits", () => {
  it("allows a first-time guest through both protections", async () => {
    const limiter = memoryLimiter();
    await enforcePilotStartRateLimits("client-a", limiter.consume);
    expect(limiter.counts.get("pilot:start:client-a")).toBe(1);
    expect(limiter.counts.get("pilot:start:global:public-pilot")).toBe(1);
  });

  it("stops repeated clicks at the client gate without draining global capacity", async () => {
    const limiter = memoryLimiter();
    for (let attempt = 0; attempt < 5; attempt += 1)
      await enforcePilotStartRateLimits("client-a", limiter.consume);
    await expect(
      enforcePilotStartRateLimits("client-a", limiter.consume),
    ).rejects.toMatchObject({ scope: pilotStartRateLimits.client.scope });
    expect(limiter.counts.get("pilot:start:client-a")).toBe(6);
    expect(limiter.counts.get("pilot:start:global:public-pilot")).toBe(5);
  });

  it("isolates two legitimate clients while retaining the shared cap", async () => {
    const limiter = memoryLimiter();
    await Promise.all([
      enforcePilotStartRateLimits("client-a", limiter.consume),
      enforcePilotStartRateLimits("client-b", limiter.consume),
    ]);
    expect(limiter.counts.get("pilot:start:client-a")).toBe(1);
    expect(limiter.counts.get("pilot:start:client-b")).toBe(1);
    expect(limiter.counts.get("pilot:start:global:public-pilot")).toBe(2);
  });

  it("retains the global capacity limit across distinct clients", async () => {
    const limiter = memoryLimiter();
    for (let client = 0; client < 100; client += 1)
      await enforcePilotStartRateLimits(`client-${client}`, limiter.consume);
    await expect(
      enforcePilotStartRateLimits("client-100", limiter.consume),
    ).rejects.toMatchObject({ scope: pilotStartRateLimits.global.scope });
  });

  it("enforces concurrent attempts atomically when backed by an atomic consumer", async () => {
    const limiter = memoryLimiter();
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        enforcePilotStartRateLimits("client-a", limiter.consume),
      ),
    );
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(5);
    expect(limiter.counts.get("pilot:start:global:public-pilot")).toBe(5);
  });

  it("returns safe actionable diagnostics without subject material", async () => {
    const response = pilotRateLimitResponse(
      new RateLimitExceededError(901, pilotStartRateLimits.global.scope),
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("901");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-obliq-rate-limit-scope")).toBe("capacity");
    expect(await response.text()).toContain("about 16 minutes");
  });
});
