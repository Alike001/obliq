import { formatMinorUnits } from "@obliq/domain";
import {
  getDashboardMetrics,
  listObligations,
  listPolicies,
  listVendorDestinations,
  listVendors,
} from "@obliq/database";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import { FirstRunGuide } from "@/components/first-run-guide";
import { StateTag } from "@/components/state-tag";
import { StatusPill } from "@/components/status-pill";
import { getDatabase } from "@/lib/db";
import { firstRunSteps } from "@/lib/first-run";
import { getTenantContext } from "@/lib/session";
export const dynamic = "force-dynamic";

export default async function AppOverviewPage() {
  const tenant = await getTenantContext();
  const db = getDatabase();
  const [metrics, recent] = await Promise.all([
    getDashboardMetrics(db, tenant.organizationId),
    listObligations(db, tenant.organizationId),
  ]);
  const firstRun =
    recent.length === 0 ? await getFirstRunSteps(db, tenant) : null;
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
        {firstRun && <FirstRunGuide steps={firstRun} />}
        <section
          className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6"
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
            highlight={(metrics.readyToSettle ?? 0) > 0}
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
              <Link href="/app/obligations" className="text-link min-h-0!">
                View all
              </Link>
            </div>
            {recent.length ? (
              recent.slice(0, 5).map(({ obligation: o, vendor }) => (
                <Link
                  key={o.id}
                  href={`/app/obligations/${o.id}`}
                  className="hairline grid grid-cols-[1fr_auto] items-center gap-3 border-t px-5 py-4 transition-colors hover:bg-stone-50"
                >
                  <div>
                    <strong className="text-sm">
                      {vendor?.displayName} · {o.reference}
                    </strong>
                    <p className="text-muted mt-1 text-xs">
                      Due {o.dueAt?.toLocaleDateString() ?? "date not set"}
                    </p>
                  </div>
                  <div className="grid justify-items-end gap-1.5">
                    <span className="font-mono text-sm font-semibold">
                      {formatMinorUnits(o.amountMinor, o.currency)}
                    </span>
                    <StateTag state={o.state} />
                  </div>
                </Link>
              ))
            ) : (
              <div className="empty hairline border-t">
                <span className="empty-icon">
                  <FilePlus2 size={20} aria-hidden />
                </span>
                <h3 className="font-semibold">No obligations yet</h3>
                <p className="text-muted max-w-sm text-sm">
                  Record your first bill and it will appear here with its state
                  and due date.
                </p>
              </div>
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
              <Ready
                label="External settlement · regtest"
                status="IMPLEMENTED"
              />
            </div>
            <a href="/proof" className="text-link mt-4">
              Open proof surface
            </a>
          </section>
        </div>
      </div>
    </main>
  );
}
// Read-only and scoped to the session's organization. It runs only while the
// organization has no obligations, and writes nothing.
async function getFirstRunSteps(
  db: ReturnType<typeof getDatabase>,
  tenant: { organizationId: string; role: string },
) {
  const [vendors, policies] = await Promise.all([
    listVendors(db, tenant.organizationId),
    listPolicies(db, tenant.organizationId),
  ]);
  const destinations = await Promise.all(
    vendors.map((vendor) =>
      listVendorDestinations(db, tenant.organizationId, vendor.id),
    ),
  );
  return firstRunSteps({
    role: tenant.role,
    vendorIds: vendors.map((vendor) => vendor.id),
    destinations: destinations.flat(),
    policyCount: policies.length,
  });
}
function Metric({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <article className={highlight ? "metric metric-attn" : "metric"}>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
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
