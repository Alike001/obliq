import { formatMinorUnits } from "@obliq/domain";
import { getControlView, getObligation } from "@obliq/database";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import {
  approvalDecisionAction,
  evaluateControlsAction,
  readinessAction,
  resolveDuplicateAction,
} from "../../actions";
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
  const [record, control] = await Promise.all([
    getObligation(getDatabase(), tenant.organizationId, id),
    getControlView(getDatabase(), tenant.organizationId, id),
  ]);
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
              Persisted financial record · version {o.version} · business
              authorization is separate from signing.
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
                  duplicates.some((item) => item.resolutionStatus === "OPEN")
                    ? "REVIEW REQUIRED"
                    : "CLEAR"
                }
              />
              <Row
                label="Policy decision"
                value={control.decision?.result ?? "NOT EVALUATED"}
              />
              <Row
                label="Approvals"
                value={
                  control.requirements.length
                    ? `${control.requirements.filter((item) => item.state === "APPROVED").length}/${control.requirements.length} REQUIREMENTS`
                    : "NOT REQUESTED"
                }
              />
              <Row
                label="Settlement readiness"
                value={o.state === "READY_TO_SETTLE" ? "READY" : "NOT READY"}
              />
            </div>
            <p className="text-muted mt-5 text-xs leading-5">
              Phase 2 may authorize preparation only. No pricing, payment
              request, signing, broadcast or settlement action exists.
            </p>
          </section>
        </div>
        <section className="card mt-5 overflow-hidden">
          <div className="hairline flex flex-wrap items-center justify-between gap-4 border-b p-5">
            <div>
              <h2 className="font-semibold">Control</h2>
              <p className="text-muted mt-1 text-xs">
                Structured findings from policy version{" "}
                {control.decision?.policyVersionId.slice(0, 8) ??
                  "not evaluated"}
              </p>
            </div>
            <form action={evaluateControlsAction.bind(null, id)}>
              <button className="button button-light">
                {control.decision
                  ? "Re-evaluate controls"
                  : "Evaluate controls"}
              </button>
            </form>
          </div>
          {!control.decision ? (
            <p className="text-muted p-6 text-sm">
              No control decision exists. The obligation remains under review.
            </p>
          ) : (
            <div className="divide-y">
              {control.findings.map((f) => (
                <div
                  key={f.id}
                  className="grid gap-2 p-5 sm:grid-cols-[160px_1fr]"
                >
                  <strong
                    className={
                      f.outcome === "PASS"
                        ? "text-emerald-800"
                        : f.outcome === "BLOCK"
                          ? "text-red-800"
                          : "text-amber-800"
                    }
                  >
                    {f.outcome} · {f.code}
                  </strong>
                  <span className="text-muted text-sm">{f.message}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="card mt-5 overflow-hidden">
          <div className="hairline border-b p-5">
            <h2 className="font-semibold">Approvals</h2>
            <p className="text-muted mt-1 text-xs">
              Business authorization only. No approval signs or broadcasts a
              Zcash transaction.
            </p>
          </div>
          {!control.requirements.length ? (
            <p className="text-muted p-6 text-sm">
              No current approval requirements.
            </p>
          ) : (
            <div className="divide-y">
              {control.requirements.map((req) => {
                const approvals = control.approvals.filter(
                  (item) => item.approval.requirementId === req.id,
                );
                const canAct =
                  tenant.role === "OWNER" ||
                  tenant.role === req.role ||
                  (tenant.role === "APPROVER" && req.role === "FINANCE");
                const creatorRestricted =
                  req.prohibitCreator && tenant.userId === o.createdBy;
                const action = approvalDecisionAction.bind(null, req.id, id);
                return (
                  <div key={req.id} className="p-5">
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <strong>{req.role}</strong>
                        <p className="text-muted mt-1 text-xs">
                          {req.reason} · {req.approvedCount}/{req.requiredCount}{" "}
                          · {req.state}
                        </p>
                        {req.prohibitCreator && (
                          <p className="mt-1 text-xs text-amber-800">
                            Requester cannot satisfy this requirement.
                          </p>
                        )}
                      </div>
                      {req.state === "PENDING" &&
                        canAct &&
                        !creatorRestricted && (
                          <form
                            action={action}
                            className="flex flex-wrap items-end gap-2"
                          >
                            <input
                              name="note"
                              aria-label="Approval note"
                              placeholder="Optional note"
                              className="hairline min-h-10 rounded-lg border px-3 text-sm"
                            />
                            <button
                              name="decision"
                              value="REJECT"
                              className="button button-light"
                            >
                              Reject
                            </button>
                            <button
                              name="decision"
                              value="APPROVE"
                              className="button button-dark"
                            >
                              Approve
                            </button>
                          </form>
                        )}
                      {req.state === "PENDING" &&
                        (!canAct || creatorRestricted) && (
                          <span className="text-muted text-xs">
                            Not eligible in this capacity
                          </span>
                        )}
                    </div>
                    {approvals.map((item) => (
                      <p
                        key={item.approval.id}
                        className="text-muted mt-3 text-xs"
                      >
                        {item.approval.decision} by{" "}
                        {item.user?.displayName ?? item.user?.email} ·{" "}
                        {item.approval.invalidatedAt
                          ? "INVALIDATED"
                          : item.approval.createdAt.toLocaleString()}
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </section>
        {duplicates
          .filter((d) => d.resolutionStatus === "OPEN")
          .map((d) => (
            <section
              className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5"
              key={d.id}
            >
              <h2 className="font-semibold">
                Possible duplicate requires resolution
              </h2>
              <p className="mt-2 text-sm">
                Candidate {d.candidateObligationId.slice(0, 8)}… · deterministic
                reasons recorded.
              </p>
              <form
                action={resolveDuplicateAction.bind(null, id, d.id)}
                className="mt-4 flex gap-2"
              >
                <input
                  className="min-h-11 flex-1 rounded-lg border px-3 text-sm"
                  name="note"
                  required
                  minLength={3}
                  placeholder="Document why this is a distinct obligation"
                />
                <button className="button button-dark">Resolve</button>
              </form>
            </section>
          ))}
        <section className="card mt-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Settlement readiness</h2>
              <p className="text-muted mt-2 text-sm">
                {control.readiness
                  ? `${control.readiness.result} · evaluated ${control.readiness.evaluatedAt.toLocaleString()}`
                  : "Not evaluated"}
              </p>
              {control.readiness?.result === "NOT_READY" && (
                <ul className="text-muted mt-3 list-disc pl-5 text-xs">
                  {(
                    control.readiness.reasonsJson as {
                      code: string;
                      message: string;
                    }[]
                  ).map((r) => (
                    <li key={r.code}>{r.message}</li>
                  ))}
                </ul>
              )}{" "}
              {o.state === "READY_TO_SETTLE" && (
                <p className="mt-3 font-semibold text-emerald-800">
                  READY TO SETTLE · Phase 2 stops here. No payment action
                  exists.
                </p>
              )}
            </div>
            <form action={readinessAction.bind(null, id)}>
              <button
                className="button button-dark"
                disabled={o.state !== "APPROVED"}
              >
                Evaluate readiness
              </button>
            </form>
          </div>
        </section>
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
