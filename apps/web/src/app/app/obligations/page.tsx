import {
  formatMinorUnits,
  obligationStates,
  type ObligationState,
} from "@obliq/domain";
import { listObligations } from "@obliq/database";
import { FilePlus2, Upload } from "lucide-react";
import Link from "next/link";
import { StateTag } from "@/components/state-tag";
import { stateLabel } from "@/components/state-tone";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";

export const metadata = { title: "Obligations" };
export const dynamic = "force-dynamic";

export default async function ObligationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string }>;
}) {
  const query = await searchParams;
  const tenant = await getTenantContext();
  // Only a state the product knows is passed on; anything else is ignored.
  const state: ObligationState | undefined = obligationStates.find(
    (known) => known === query.state,
  );
  const items = await listObligations(getDatabase(), tenant.organizationId, {
    ...(query.q ? { search: query.q } : {}),
    ...(state ? { state } : {}),
  });
  const filtered = Boolean(query.q || state);
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow">Accounts payable</p>
            <h1 className="mt-3 text-3xl font-medium tracking-tight">
              Obligations
            </h1>
            <p className="text-muted mt-2 text-sm">
              Every bill your organization owes, from recorded to settled.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="button button-light"
              href="/app/obligations/upload"
            >
              <Upload size={16} />
              Upload invoice
            </Link>
            <Link className="button button-dark" href="/app/obligations/new">
              <FilePlus2 size={16} />
              Manual entry
            </Link>
          </div>
        </div>
        <form className="mt-7 flex gap-3" role="search">
          {state && <input type="hidden" name="state" value={state} />}
          <input
            name="q"
            defaultValue={query.q}
            aria-label="Search obligations"
            placeholder="Search vendor, reference or purpose"
            className="hairline bg-panel min-h-11 flex-1 rounded-lg border px-3 text-sm"
          />
          <button className="button button-light">Search</button>
        </form>
        {state && (
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="text-muted">Showing only</span>
            <StateTag state={state} />
            <Link
              className="text-link"
              href={
                query.q
                  ? `/app/obligations?q=${encodeURIComponent(query.q)}`
                  : "/app/obligations"
              }
            >
              Show all states
            </Link>
          </p>
        )}
        {items.length === 0 ? (
          <section className="card empty mt-5">
            <span className="empty-icon">
              <FilePlus2 size={20} aria-hidden />
            </span>
            <h2 className="font-semibold">
              {query.q
                ? `Nothing matches “${query.q}”`
                : state
                  ? `No obligations are ${stateLabel(state).toLowerCase()}`
                  : "No obligations yet"}
            </h2>
            <p className="text-muted max-w-sm text-sm">
              {query.q
                ? "Try a vendor name, a reference number or part of the purpose."
                : state
                  ? "Nothing is in this state right now. Other obligations are not shown."
                  : "Create one manually or begin with an invoice document."}
            </p>
            {filtered ? (
              <Link
                className="button button-light mt-3"
                href="/app/obligations"
              >
                {query.q ? "Clear search" : "Show all states"}
              </Link>
            ) : (
              <Link
                className="button button-dark mt-3"
                href="/app/obligations/new"
              >
                Record obligation
              </Link>
            )}
          </section>
        ) : (
          <div className="card mt-5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="stack-table w-full text-left text-sm sm:min-w-[850px]">
                <thead className="bg-stone-100/70 text-xs">
                  <tr>
                    <th scope="col" className="p-4">
                      Reference
                    </th>
                    <th scope="col">Vendor</th>
                    <th scope="col">State</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Due</th>
                    <th scope="col">Source</th>
                    <th scope="col">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ obligation: o, vendor }) => (
                    <tr key={o.id} className="hairline border-t">
                      <td className="font-semibold sm:p-4">
                        <Link href={`/app/obligations/${o.id}`}>
                          {o.reference}
                        </Link>
                      </td>
                      <td data-label="Vendor">{vendor?.displayName ?? "—"}</td>
                      <td data-label="State">
                        <StateTag state={o.state} />
                      </td>
                      <td data-label="Amount" className="font-mono">
                        {formatMinorUnits(o.amountMinor, o.currency)}
                      </td>
                      <td data-label="Due">
                        {o.dueAt?.toLocaleDateString() ?? "—"}
                      </td>
                      <td data-label="Source">
                        {o.sourceId ? "Recorded" : "—"}
                      </td>
                      <td data-label="Category">{o.category ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
