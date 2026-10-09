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
import { attentionQueue } from "@/lib/attention";
import { getDatabase } from "@/lib/db";
import { firstRunSteps } from "@/lib/first-run";
import { getTenantContext } from "@/lib/session";
export const dynamic = "force-dynamic";

// `listObligations` returns at most this many, earliest due date first. The
// queue below is built from that page of records, so it says so.
const LOADED_LIMIT = 100;

export default async function AppOverviewPage() {
  const tenant = await getTenantContext();
  const db = getDatabase();
  const [metrics, recent] = await Promise.all([
    getDashboardMetrics(db, tenant.organizationId),
    listObligations(db, tenant.organizationId),
  ]);
  const firstRun =
    recent.length === 0 ? await getFirstRunSteps(db, tenant) : null;
  const queue = attentionQueue(
    recent.map(({ obligation, vendor }) => ({
      id: obligation.id,
      state: obligation.state,
      dueAt: obligation.dueAt,
      reference: obligation.reference,
      vendorName: vendor?.displayName,
      amount: formatMinorUnits(obligation.amountMinor, obligation.currency),
    })),
  );
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
            href="/app/obligations?state=UNDER_REVIEW"
          />
          <Metric
            label="Awaiting approval"
            value={String(metrics.awaitingApproval ?? 0)}
            href="/app/obligations?state=APPROVAL_REQUIRED"
          />
          <Metric
            label="Blocked"
            value={String(metrics.blocked ?? 0)}
            href="/app/obligations?state=BLOCKED"
          />
          <Metric
            label="Ready to settle"
            value={String(metrics.readyToSettle ?? 0)}
            highlight={(metrics.readyToSettle ?? 0) > 0}
            href="/app/obligations?state=READY_TO_SETTLE"
          />
          <Metric label="Due in 14 days" value={String(metrics.dueSoon ?? 0)} />
          <Metric
            label="Possible duplicates"
            value={String(metrics.possibleDuplicates)}
          />
        </section>
        {queue.length > 0 && (
          <section
            className="card mt-5 overflow-hidden"
            aria-labelledby="attention-h"
          >
            <div className="hairline flex flex-wrap items-baseline justify-between gap-2 border-b p-5">
              <div>
                <h2 id="attention-h" className="font-semibold">
                  Needs attention, from loaded records
                </h2>
                <p className="text-muted mt-1 max-w-[68ch] text-xs leading-5">
                  Built from the {recent.length}{" "}
                  {recent.length === 1 ? "obligation" : "obligations"} this page
                  loaded (up to {LOADED_LIMIT}, earliest due date first). It is
                  not a list of every outstanding obligation. The counts above
                  cover the whole organization.
                </p>
              </div>
              <p className="text-muted text-xs">
                {queue.length} of {recent.length} loaded
              </p>
            </div>
            {recent.length >= LOADED_LIMIT && (
              <p
                className="hairline text-hold bg-hold-bg flex items-start gap-2 border-b px-5 py-3 text-xs font-medium"
                role="note"
              >
                <span className="glyph glyph-attn mt-[0.15rem]" aria-hidden />
                More obligations exist than were loaded, so records that need
                attention may be missing here. Open each count above to see its
                full list.
              </p>
            )}
            <ul>
              {queue.slice(0, 6).map((item) => (
                <li
                  key={item.id}
                  className="hairline border-t first:border-t-0"
                >
                  <Link
                    href={`/app/obligations/${item.id}`}
                    className="grid gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-stone-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.next}</p>
                      <p className="text-muted mt-1 text-xs break-words">
                        {item.vendorName ?? "No vendor"} · {item.reference} ·
                        Due {item.dueAt?.toLocaleDateString() ?? "date not set"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                      <span className="font-mono text-sm font-semibold">
                        {item.amount}
                      </span>
                      <StateTag state={item.state} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            {queue.length > 6 && (
              <p className="hairline text-muted border-t px-5 py-3 text-xs">
                {queue.length - 6} more among the loaded records. Use the counts
                above to open each full list.
              </p>
            )}
          </section>
        )}
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
  href,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  /** The list this count is drawn from, when one exists. */
  href?: string;
}) {
  const className = highlight ? "metric metric-attn" : "metric";
  const body = (
    <>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
    </>
  );
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <article className={className}>{body}</article>
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
