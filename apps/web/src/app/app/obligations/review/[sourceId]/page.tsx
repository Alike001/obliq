import { extractionResultSchema } from "@obliq/ai";
import { getSourceReview, listVendors } from "@obliq/database";
import { notFound } from "next/navigation";
import { ObligationForm } from "@/components/obligation-form";
import { StatusPill } from "@/components/status-pill";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { createReviewedObligationAction } from "../../../actions";
export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;
  const tenant = await getTenantContext();
  const [review, vendors] = await Promise.all([
    getSourceReview(getDatabase(), tenant.organizationId, sourceId),
    listVendors(getDatabase(), tenant.organizationId),
  ]);
  if (!review || !review.extraction) notFound();
  const result = extractionResultSchema.parse(review.extraction.resultJson);
  const metadata = review.source.metadataJson as {
    originalFilename?: string;
    mediaType?: string;
    sizeBytes?: number;
  };
  const action = createReviewedObligationAction.bind(null, sourceId);
  const defaults = {
    reference: result.invoiceNumber.value ?? "",
    amount: result.amount.value ?? "",
    currency: result.currency.value ?? "USD",
    dueDate: result.dueDate.value ?? "",
    category: result.category.value ?? "",
    description: result.description.value ?? "",
  };
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center gap-3">
          <p className="eyebrow">Human review</p>
          <StatusPill status="SEEDED" />
        </div>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          Confirm the financial record
        </h1>
        <p className="text-muted mt-2 text-sm">
          Suggestions remain editable and do not become an obligation until you
          submit.
        </p>
        <section className="card mt-6 grid gap-3 p-5 text-xs sm:grid-cols-3">
          <div>
            <span className="text-muted block">Original filename</span>
            <strong className="mt-1 block break-all">
              {metadata.originalFilename}
            </strong>
          </div>
          <div>
            <span className="text-muted block">Detected type</span>
            <strong className="mt-1 block">{metadata.mediaType}</strong>
          </div>
          <div>
            <span className="text-muted block">Extraction provider</span>
            <strong className="mt-1 block">
              {result.provider} · {result.mode}
            </strong>
          </div>
        </section>
        <div className="mt-5 rounded-lg bg-amber-50 p-4 text-xs text-amber-950">
          Uncertain fields are intentionally blank. The fixture only derives a
          low-confidence reference from the filename and supplies a
          low-confidence currency default.
        </div>
        <ObligationForm
          vendors={vendors}
          action={action}
          defaults={defaults}
          submitLabel="Confirm and create obligation"
        />
      </div>
    </main>
  );
}
