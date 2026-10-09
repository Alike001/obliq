import { Notice } from "@/components/notice";
import { BackLink } from "@/components/record";
import { SubmitButton } from "@/components/submit-button";
import { uploadInvoiceAction } from "../../actions";

export default function UploadInvoicePage() {
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <BackLink href="/app/obligations" label="Obligations" />
        <p className="eyebrow mt-3">Invoice ingestion</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          Upload an invoice
        </h1>
        <p className="text-muted mt-2 text-sm">
          Step 1 of 2. The document is stored privately for this organization;
          you confirm every value on the next page.
        </p>
        <form action={uploadInvoiceAction} className="card mt-8 p-6 md:p-8">
          <label
            className="block text-[0.8125rem] font-bold"
            htmlFor="invoice-file"
          >
            Invoice document
          </label>
          <input
            id="invoice-file"
            className="mt-2 block w-full rounded-lg border p-3 text-sm"
            type="file"
            name="invoice"
            accept="application/pdf,image/png,image/jpeg"
            aria-describedby="invoice-hint"
            required
          />
          <p id="invoice-hint" className="text-muted mt-2 text-xs">
            PDF, PNG or JPEG, up to 10 MB.
          </p>
          <Notice
            tone="hatched"
            title="Development extraction is seeded"
            className="mt-6 text-xs"
          >
            The fixture does not read the document or establish financial truth.
            You must review and enter every material value before a record is
            created.
          </Notice>
          <SubmitButton
            className="button button-dark mt-6"
            pendingLabel="Uploading…"
          >
            Upload and review
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
