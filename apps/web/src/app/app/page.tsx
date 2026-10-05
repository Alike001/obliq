import { formatMinorUnits } from "@obliq/domain";
import { getDashboardMetrics, listObligations } from "@obliq/database";
import { ArrowUpRight, FilePlus2 } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
export const dynamic = "force-dynamic";

export default async function AppOverviewPage() {
  const tenant = await getTenantContext();
  const db = getDatabase();
  const [metrics, recent] = await Promise.all([
    getDashboardMetrics(db, tenant.organizationId),
    listObligations(db, tenant.organizationId),
  ]);
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">Operations overview</p>
            <h1 className="mt-3 text-3xl font-medium tracking-tight">
              Obligation operations
            </h1>
            <p className="text-muted mt-2 text-sm">
              Live metrics from this organization&apos;s persisted records.
            </p>
          </div>
          <Link href="/app/obligations/new" className="button button-dark">
            <FilePlus2 size={16} />
            Record obligation
          </Link>
        </div>
        <section
          className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
          aria-label="Real control metrics"
        >
          <Metric
            label="Awaiting review"
            value={String(metrics.awaitingReview ?? 0)}
          />
          <Metric
            label="Awaiting approval"
            value={String(metrics.awaitingApproval ?? 0)}
          />
          <Metric label="Blocked" value={String(metrics.blocked ?? 0)} />
          <Metric
            label="Ready to settle"
            value={String(metrics.readyToSettle ?? 0)}
          />
          <Metric label="Due in 14 days" value={String(metrics.dueSoon ?? 0)} />
          <Metric
            label="Possible duplicates"
            value={String(metrics.possibleDuplicates)}
          />
        </section>
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
          <section className="card overflow-hidden">
            <div className="hairline flex justify-between border-b p-5">
              <div>
                <h2 className="font-semibold">Recent obligations</h2>
                <p className="text-muted mt-1 text-xs">Persisted—not seeded</p>
              </div>
              <Link
                href="/app/obligations"
                className="text-forest text-xs font-semibold"
              >
                View all
              </Link>
            </div>
            {recent.length ? (
              recent.slice(0, 5).map(({ obligation: o, vendor }) => (
                <Link
                  key={o.id}
                  href={`/app/obligations/${o.id}`}
                  className="hairline grid grid-cols-[1fr_auto] gap-3 border-t p-5"
                >
                  <div>
                    <strong className="text-sm">
                      {vendor?.displayName} · {o.reference}
                    </strong>
                    <p className="text-muted mt-1 text-xs">
                      {o.state} · due {o.dueAt?.toLocaleDateString()}
                    </p>
                  </div>
                  <span className="font-mono text-sm">
                    {formatMinorUnits(o.amountMinor, o.currency)}
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-muted p-8 text-center text-sm">
                No obligations yet.
              </p>
            )}
          </section>
          <section className="card p-5">
            <h2 className="font-semibold">System readiness</h2>
            <div className="mt-5 space-y-4">
              <Ready label="Obligation persistence" status="IMPLEMENTED" />
              <Ready label="Policy + approvals" status="IMPLEMENTED" />
              <Ready label="Settlement readiness" status="IMPLEMENTED" />
              <Ready label="Audit hash chain" status="IMPLEMENTED" />
              <Ready label="Extraction fixture" status="SEEDED" />
              <Ready label="Zcash settlement" status="UNAVAILABLE" />
            </div>
            <a
              href="/proof"
              className="text-forest mt-6 inline-flex items-center gap-2 text-xs font-semibold"
            >
              Open proof surface <ArrowUpRight size={14} />
            </a>
          </section>
        </div>
      </div>
    </main>
  );
}
function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <article className="card p-5">
      <p className="text-muted text-xs">{label}</p>
      <p className="mt-4 text-2xl font-medium tracking-tight">{value}</p>
      {note && <p className="text-muted mt-2 text-[10px] leading-4">{note}</p>}
    </article>
  );
}
function Ready({
  label,
  status,
}: {
  label: string;
  status: "IMPLEMENTED" | "SEEDED" | "UNAVAILABLE";
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted text-xs">{label}</span>
      <StatusPill status={status} />
    </div>
  );
}
