import { extractionResultSchema } from "@obliq/ai";
import { getSourceReview, listVendors } from "@obliq/database";
import { notFound } from "next/navigation";
import { Notice } from "@/components/notice";
import { ObligationForm } from "@/components/obligation-form";
import { BackLink } from "@/components/record";
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
        <BackLink href="/app/obligations" label="Obligations" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <p className="eyebrow">Human review</p>
          <StatusPill status="SEEDED" />
        </div>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          Confirm the financial record
        </h1>
        <p className="text-muted mt-2 text-sm">
          Step 2 of 2. Suggestions remain editable and do not become an
          obligation until you submit.
        </p>
        <section
          className="card mt-6 grid gap-4 p-5 text-xs sm:grid-cols-3"
          aria-label="Uploaded document"
        >
          <div>
            <span className="fact-label block">Original filename</span>
            <strong className="mt-1 block break-all">
              {metadata.originalFilename ?? "Not recorded"}
            </strong>
          </div>
          <div>
            <span className="fact-label block">Detected type</span>
            <strong className="mt-1 block">
              {metadata.mediaType ?? "Not recorded"}
            </strong>
          </div>
          <div>
            <span className="fact-label block">Extraction provider</span>
            <strong className="mt-1 block">
              {result.provider} · {result.mode}
            </strong>
          </div>
        </section>
        <Notice
          tone="hatched"
          title="Check every value against the document"
          className="mt-5 text-xs"
        >
          Uncertain fields are intentionally blank. The fixture only derives a
          low-confidence reference from the filename and supplies a
          low-confidence currency default.
        </Notice>
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
