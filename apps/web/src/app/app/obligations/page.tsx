import { formatMinorUnits } from "@obliq/domain";
import { listObligations } from "@obliq/database";
import { FilePlus2, Upload } from "lucide-react";
import Link from "next/link";
import { StateTag } from "@/components/state-tag";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
export const dynamic = "force-dynamic";

export default async function ObligationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; state?: string }>;
}) {
  const query = await searchParams;
  const tenant = await getTenantContext();
  const items = await listObligations(getDatabase(), tenant.organizationId, {
    ...(query.q ? { search: query.q } : {}),
    ...(query.state ? { state: query.state } : {}),
  });
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
              Persisted bills awaiting control evaluation.
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
          <input
            name="q"
            defaultValue={query.q}
            aria-label="Search obligations"
            placeholder="Search vendor, reference or purpose"
            className="hairline bg-panel min-h-11 flex-1 rounded-lg border px-3 text-sm"
          />
          <button className="button button-light">Search</button>
        </form>
        {items.length === 0 ? (
          <section className="card empty mt-5">
            <span className="empty-icon">
              <FilePlus2 size={20} aria-hidden />
            </span>
            <h2 className="font-semibold">
              {query.q ? `Nothing matches “${query.q}”` : "No obligations yet"}
            </h2>
            <p className="text-muted max-w-sm text-sm">
              {query.q
                ? "Try a vendor name, a reference number or part of the purpose."
                : "Create one manually or begin with an invoice document."}
            </p>
            {query.q ? (
              <Link
                className="button button-light mt-3"
                href="/app/obligations"
              >
                Clear search
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
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-stone-100/70 text-xs">
                  <tr>
                    <th className="p-4">Reference</th>
                    <th>Vendor</th>
                    <th>State</th>
                    <th>Amount</th>
                    <th>Due</th>
                    <th>Source</th>
                    <th>Category</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ obligation: o, vendor }) => (
                    <tr key={o.id} className="hairline border-t">
                      <td className="p-4 font-semibold">
                        <Link href={`/app/obligations/${o.id}`}>
                          {o.reference}
                        </Link>
                      </td>
                      <td>{vendor?.displayName ?? "—"}</td>
                      <td>
                        <StateTag state={o.state} />
                      </td>
                      <td className="font-mono">
                        {formatMinorUnits(o.amountMinor, o.currency)}
                      </td>
                      <td>{o.dueAt?.toLocaleDateString() ?? "—"}</td>
                      <td>{o.sourceId ? "Recorded" : "—"}</td>
                      <td>{o.category ?? "—"}</td>
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
