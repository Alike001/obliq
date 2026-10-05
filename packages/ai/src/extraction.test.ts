import { describe, expect, it } from "vitest";
import { DevelopmentFixtureExtractor, extractionResultSchema } from "./index";

describe("extraction boundary", () => {
  it("labels fixture output and requires review for every suggestion", async () => {
    const result = await new DevelopmentFixtureExtractor().extract({
      originalFilename: "invoice-1042.pdf",
      mediaType: "application/pdf",
      contentHash: "hash",
    });
    expect(result.mode).toBe("SEEDED_FIXTURE");
    expect(
      Object.values(result)
        .filter((v) => typeof v === "object")
        .every((v) => v.requiresHumanReview),
    ).toBe(true);
  });
  it("rejects unreviewable or malformed provider output", () => {
    expect(
      extractionResultSchema.safeParse({ provider: "bad", mode: "LIVE" })
        .success,
    ).toBe(false);
  });
});
