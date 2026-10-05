import { z } from "zod";

const suggestion = <T extends z.ZodType>(schema: T) =>
  z.strictObject({
    value: schema.nullable(),
    confidenceBasisPoints: z.number().int().min(0).max(10_000),
    provenance: z.string().min(1).max(200),
    requiresHumanReview: z.literal(true),
  });

export const extractionResultSchema = z.strictObject({
  provider: z.string().min(1),
  mode: z.enum(["LIVE", "SEEDED_FIXTURE"]),
  vendorName: suggestion(z.string().max(160)),
  invoiceNumber: suggestion(z.string().max(100)),
  amount: suggestion(z.string().regex(/^\d+(?:\.\d{1,2})?$/)),
  currency: suggestion(z.string().regex(/^[A-Z]{3}$/)),
  dueDate: suggestion(z.iso.date()),
  category: suggestion(z.string().max(80)),
  description: suggestion(z.string().max(500)),
});
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export interface InvoiceExtractionProvider {
  readonly name: string;
  readonly mode: "LIVE" | "SEEDED_FIXTURE";
  extract(input: {
    originalFilename: string;
    mediaType: string;
    contentHash: string;
  }): Promise<ExtractionResult>;
}

const emptySuggestion = (provenance: string) => ({
  value: null,
  confidenceBasisPoints: 0,
  provenance,
  requiresHumanReview: true as const,
});

export class DevelopmentFixtureExtractor implements InvoiceExtractionProvider {
  readonly name = "development-fixture";
  readonly mode = "SEEDED_FIXTURE" as const;
  extract(input: {
    originalFilename: string;
    mediaType: string;
    contentHash: string;
  }): Promise<ExtractionResult> {
    const stem = input.originalFilename
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9-]/g, "-")
      .slice(0, 100);
    return Promise.resolve(
      extractionResultSchema.parse({
        provider: this.name,
        mode: this.mode,
        vendorName: emptySuggestion("Fixture does not infer vendor identity"),
        invoiceNumber: {
          value: stem || null,
          confidenceBasisPoints: stem ? 2500 : 0,
          provenance: "Derived from filename by labelled fixture",
          requiresHumanReview: true,
        },
        amount: emptySuggestion("Fixture does not infer money"),
        currency: {
          value: "USD",
          confidenceBasisPoints: 1000,
          provenance: "Development default only",
          requiresHumanReview: true,
        },
        dueDate: emptySuggestion("Fixture does not infer dates"),
        category: emptySuggestion("Fixture does not classify category"),
        description: emptySuggestion(
          "Fixture does not summarize document content",
        ),
      }),
    );
  }
}
