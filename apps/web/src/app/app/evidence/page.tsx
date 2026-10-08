import { evidenceFields, type EvidenceFieldKey } from "@obliq/evidence";
import {
  listEvidenceEligibleObligations,
  listEvidencePackages,
} from "@obliq/database";
import Link from "next/link";
import { Field, Select } from "@/components/finance-form";
import { Notice } from "@/components/notice";
import { StateTag } from "@/components/state-tag";
import { stateLabel } from "@/components/state-tone";
import { SubmitButton } from "@/components/submit-button";
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
            <div className="border-line-strong mt-6 rounded-lg border border-dashed p-6 text-sm">
              <p className="font-semibold">Nothing is eligible yet</p>
              <p className="text-muted mt-1">
                Evidence can only be issued for an obligation that is settled
                and matched by the read-only observer. Approved or broadcast is
                not enough.
              </p>
              <Link href="/app/settlements" className="text-link mt-3">
                See settlements
              </Link>
            </div>
          ) : (
            <form action={previewEvidenceAction} className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Settled obligation">
                  <Select
                    name="obligationId"
                    defaultValue={
                      query.obligationId ?? eligible[0]?.obligation.id
                    }
                    required
                  >
                    {eligible.map(({ obligation, vendor }) => (
                      <option key={obligation.id} value={obligation.id}>
                        {obligation.reference} · {vendor.displayName}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Disclosure template"
                  hint="Sets which fields are shown unless you choose them below."
                >
                  <Select
                    name="template"
                    defaultValue="MINIMAL_PAYMENT_CONFIRMATION"
                  >
                    <option value="MINIMAL_PAYMENT_CONFIRMATION">
                      Minimal payment confirmation
                    </option>
                    <option value="VENDOR_RECEIPT">Vendor receipt</option>
                    <option value="ACCOUNTANT_EVIDENCE">
                      Accountant evidence
                    </option>
                  </Select>
                </Field>
              </div>
              <fieldset>
                <legend className="text-[0.8125rem] font-bold">
                  Or choose the disclosed fields yourself
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
                      className="bg-surface border-line-strong flex min-h-14 cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs"
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
                        <span className="text-muted mt-1 block text-[0.6875rem]">
                          {stateLabel(evidenceFields[field].classification)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Notice
                tone="hold"
                title="Finance and audit fields disclose more"
                className="text-xs"
              >
                They can expose approval, ZEC, network or transaction
                information. Your role is checked on the server for every field,
                whatever this form sends.
              </Notice>
              <SubmitButton pendingLabel="Building preview…">
                Preview recipient view
              </SubmitButton>
            </form>
          )}
        </section>

        <section className="card mt-6 overflow-hidden">
          <div className="border-b p-5">
            <h2 className="font-semibold">Issued evidence</h2>
          </div>
          {packages.length === 0 ? (
            <p className="text-muted p-6 text-sm">
              No evidence has been issued. A preview is not an issued package.
            </p>
          ) : (
            <div className="divide-y">
              {packages.map(({ package: item, obligation }) => (
                <Link
                  key={item.id}
                  href={`/app/evidence/${item.id}`}
                  className="grid gap-x-4 gap-y-2 p-5 transition-colors hover:bg-stone-50 md:grid-cols-[1fr_auto_auto] md:items-center"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {obligation.reference}
                    </p>
                    <p className="text-muted mt-1 text-xs">
                      {stateLabel(item.template)} · version {item.version}
                    </p>
                  </div>
                  <span>
                    <StateTag state={item.status} />
                  </span>
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
