import { evidenceFields, type EvidenceFieldKey } from "@obliq/evidence";
import {
  listEvidenceEligibleObligations,
  listEvidencePackages,
} from "@obliq/database";
import Link from "next/link";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { previewEvidenceAction } from "../actions";

export const dynamic = "force-dynamic";

const fieldOrder = Object.keys(evidenceFields) as EvidenceFieldKey[];

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: Promise<{ obligationId?: string }>;
}) {
  const query = await searchParams;
  const actor = await getTenantContext();
  const [packages, eligible] = await Promise.all([
    listEvidencePackages(getDatabase(), actor),
    listEvidenceEligibleObligations(getDatabase(), actor),
  ]);
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">Prove</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">Evidence</h1>
        <p className="text-muted mt-3 max-w-3xl text-sm leading-6">
          Issue immutable, integrity-protected receipts from settled canonical
          records. Choose exactly what a recipient may see. These artifacts are
          not zero-knowledge business proofs.
        </p>

        <section className="card mt-8 p-6">
          <h2 className="font-semibold">Create evidence</h2>
          <p className="text-muted mt-2 text-xs leading-5">
            The next step is a mandatory recipient preview. No package is issued
            until you review that exact artifact.
          </p>
          {eligible.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed p-6 text-sm">
              No settled obligations are eligible yet. Evidence can only derive
              from a matching SETTLED reconciliation record.
            </div>
          ) : (
            <form action={previewEvidenceAction} className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-xs font-medium">
                  Settled obligation
                  <select
                    name="obligationId"
                    defaultValue={
                      query.obligationId ?? eligible[0]?.obligation.id
                    }
                    required
                    className="mt-2 min-h-11 w-full rounded-lg border bg-white px-3"
                  >
                    {eligible.map(({ obligation, vendor }) => (
                      <option key={obligation.id} value={obligation.id}>
                        {obligation.reference} · {vendor.displayName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium">
                  Disclosure template
                  <select
                    name="template"
                    defaultValue="MINIMAL_PAYMENT_CONFIRMATION"
                    className="mt-2 min-h-11 w-full rounded-lg border bg-white px-3"
                  >
                    <option value="MINIMAL_PAYMENT_CONFIRMATION">
                      Minimal payment confirmation
                    </option>
                    <option value="VENDOR_RECEIPT">Vendor receipt</option>
                    <option value="ACCOUNTANT_EVIDENCE">
                      Accountant evidence
                    </option>
                  </select>
                </label>
              </div>
              <fieldset>
                <legend className="text-xs font-semibold">
                  Or explicitly choose disclosed fields
                </legend>
                <p className="text-muted mt-1 text-xs">
                  If none are checked, the selected template defaults apply.
                  Issuer name is always included so recipients can identify the
                  package source.
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {fieldOrder.map((field) => (
                    <label
                      key={field}
                      className="flex min-h-14 items-start gap-3 rounded-lg border bg-white p-3 text-xs"
                    >
                      <input
                        type="checkbox"
                        name="disclosedFields"
                        value={field}
                        className="mt-0.5 size-4"
                      />
                      <span>
                        <span className="font-semibold">
                          {evidenceFields[field].label}
                        </span>
                        <span className="text-muted mt-1 block font-mono text-[10px]">
                          {evidenceFields[field].classification}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs leading-5">
                FINANCE and AUDIT fields can expose approval, ZEC, network, or
                transaction information. Server-side role checks apply even if a
                request bypasses this form.
              </div>
              <button className="button button-dark">
                Preview recipient view
              </button>
            </form>
          )}
        </section>

        <section className="card mt-6 overflow-hidden">
          <div className="border-b p-5">
            <h2 className="font-semibold">Issued evidence</h2>
          </div>
          {packages.length === 0 ? (
            <p className="text-muted p-6 text-sm">
              No evidence has been issued.
            </p>
          ) : (
            <div className="divide-y">
              {packages.map(({ package: item, obligation }) => (
                <Link
                  key={item.id}
                  href={`/app/evidence/${item.id}`}
                  className="grid gap-2 p-5 hover:bg-stone-50 md:grid-cols-[1fr_auto_auto] md:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {obligation.reference}
                    </p>
                    <p className="text-muted mt-1 text-xs">
                      {item.template.replaceAll("_", " ")} · version{" "}
                      {item.version}
                    </p>
                  </div>
                  <span className="font-mono text-xs">{item.status}</span>
                  <span className="text-muted text-xs">
                    {item.createdAt.toLocaleDateString()}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
