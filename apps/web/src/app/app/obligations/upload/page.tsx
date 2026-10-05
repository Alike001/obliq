import { uploadInvoiceAction } from "../../actions";
export default function UploadInvoicePage() {
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">Invoice ingestion</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          Upload an invoice
        </h1>
        <p className="text-muted mt-2 text-sm">
          PDF, PNG or JPEG · 10 MB maximum · private organization-scoped
          storage.
        </p>
        <form action={uploadInvoiceAction} className="card mt-8 p-6 md:p-8">
          <label className="block text-sm font-medium">
            Invoice document
            <input
              className="hairline mt-3 block w-full rounded-lg border bg-white p-4 text-sm"
              type="file"
              name="invoice"
              accept="application/pdf,image/png,image/jpeg"
              required
            />
          </label>
          <div className="mt-6 rounded-lg bg-amber-50 p-4 text-xs leading-5 text-amber-950">
            <strong>Development extraction is SEEDED.</strong> The fixture does
            not inspect the document or establish financial truth. You must
            review and enter every material value before a record is created.
          </div>
          <button className="button button-dark mt-6">Upload and review</button>
        </form>
      </div>
    </main>
  );
}
