import { formatMinorUnits } from "@obliq/domain";
import { getObligation } from "@obliq/database";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
export const dynamic = "force-dynamic";

export default async function ObligationDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    created?: string;
    updated?: string;
    duplicate?: string;
  }>;
}) {
  const { id } = await params;
  const notice = await searchParams;
  const tenant = await getTenantContext();
  const record = await getObligation(getDatabase(), tenant.organizationId, id);
  if (!record) notFound();
  const { obligation: o, vendor, source, duplicates, activity } = record;
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Obligation</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-medium tracking-tight">
                {o.reference}
              </h1>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold">
                {o.state}
              </span>
            </div>
            <p className="text-muted mt-2 text-sm">
              Created as a persisted record; controls and approvals have not
              started.
            </p>
          </div>
          <Link
            href={`/app/obligations/${id}/edit`}
            className="button button-light"
          >
            Edit record
          </Link>
        </div>
        {(notice.created || notice.updated) && (
          <p className="mt-6 rounded-lg bg-emerald-50 p-4 text-sm text-emerald-950">
            {notice.created
              ? "Obligation created from your confirmed values."
              : "Obligation updated and audit version advanced."}
          </p>
        )}
        {notice.duplicate === "blocked" && (
          <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-950">
            Exact duplicate creation was blocked. This is the existing matching
            obligation.
          </p>
        )}
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <section className="card p-6">
            <h2 className="font-semibold">Business details</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <Detail label="Vendor" value={vendor?.displayName ?? "—"} />
              <Detail
                label="Amount"
                value={formatMinorUnits(o.amountMinor, o.currency)}
              />
              <Detail
                label="Due date"
                value={o.dueAt?.toLocaleDateString() ?? "—"}
              />
              <Detail label="Type" value={o.type} />
              <Detail label="Category" value={o.category ?? "—"} />
              <Detail label="Source" value={source?.kind ?? "—"} />
              <div className="sm:col-span-2">
                <Detail label="Purpose" value={o.description} />
              </div>
            </dl>
          </section>
          <section className="card p-6">
            <h2 className="font-semibold">Control boundary</h2>
            <div className="mt-5 space-y-4">
              <Row
                label="Duplicate findings"
                value={
                  duplicates.length ? `${duplicates.length} POSSIBLE` : "NONE"
                }
              />
              <Row label="Approval" value="UNAVAILABLE" />
              <Row label="Settlement" value="UNAVAILABLE" />
            </div>
            <p className="text-muted mt-5 text-xs leading-5">
              Phase 1 stops at UNDER_REVIEW. APPROVAL_REQUIRED is not asserted
              until the Phase 2 policy engine evaluates this obligation.
            </p>
          </section>
        </div>
        <section className="card mt-5 overflow-hidden">
          <div className="hairline border-b p-5">
            <h2 className="font-semibold">Activity history</h2>
            <p className="text-muted mt-1 text-xs">
              Organization-scoped, hash-chained audit events.
            </p>
          </div>
          {activity.map((e) => (
            <div
              key={e.id}
              className="hairline flex items-start justify-between gap-4 border-t p-5 text-sm"
            >
              <div>
                <strong>{e.eventType.replaceAll("_", " ")}</strong>
                <p className="text-muted mt-1 text-xs">
                  Actor {e.actorId?.slice(0, 8)}… · hash{" "}
                  {e.payloadHash.slice(0, 12)}…
                </p>
              </div>
              <time className="text-muted text-xs">
                {e.createdAt.toLocaleString()}
              </time>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
