import { formatMinorUnits } from "@obliq/domain";
import {
  getControlView,
  getObligation,
  getObligationSettlement,
  getObserverStatus,
  listObligationObservations,
} from "@obliq/database";
import { notFound } from "next/navigation";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { Notice } from "@/components/notice";
import { BackLink, Fact } from "@/components/record";
import { StateTag } from "@/components/state-tag";
import { stateLabel } from "@/components/state-tone";
import { SubmitButton } from "@/components/submit-button";
import { nextStepFor } from "@/lib/attention";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import {
  approvalDecisionAction,
  createSettlementIntentAction,
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
    controls?: string;
    approval?: string;
    readiness?: string;
  }>;
}) {
  const { id } = await params;
  const notice = await searchParams;
  const tenant = await getTenantContext();
  const [record, control, settlement, observations, observerStatus] =
    await Promise.all([
      getObligation(getDatabase(), tenant.organizationId, id),
      getControlView(getDatabase(), tenant.organizationId, id),
      getObligationSettlement(getDatabase(), tenant.organizationId, id),
      listObligationObservations(getDatabase(), tenant.organizationId, id),
      getObserverStatus(getDatabase(), tenant.organizationId, "regtest"),
    ]);
  if (!record) notFound();
  const { obligation: o, vendor, source, duplicates, activity } = record;
  const openDuplicates = duplicates.filter(
    (item) => item.resolutionStatus === "OPEN",
  );
  const approved = control.requirements.filter(
    (item) => item.state === "APPROVED",
  ).length;
  const nextStep = nextStepFor(o.state);
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <BackLink href="/app/obligations" label="Obligations" />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Obligation</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-medium tracking-tight">
                {o.reference}
              </h1>
              <StateTag state={o.state} />
            </div>
            <p className="text-muted mt-2 text-sm">
              Persisted financial record · version {o.version} · business
              authorization is separate from signing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {o.state === "SETTLED" && (
              <Link
                href={`/app/evidence?obligationId=${o.id}`}
                className="button button-dark"
              >
                Create evidence
              </Link>
            )}
            <Link
              href={`/app/obligations/${id}/edit`}
              className="button button-light"
            >
              Edit record
            </Link>
          </div>
        </div>
        {notice.created && (
          <Notice tone="done" title="Obligation created" live className="mt-6">
            It was recorded from the values you confirmed and is under review.
            Nothing has been approved or paid.
          </Notice>
        )}
        {notice.updated && (
          <Notice tone="done" title="Obligation updated" live className="mt-6">
            A new version was saved and added to the audit history. Controls and
            approvals made on the earlier version may need to be repeated.
          </Notice>
        )}
        {notice.duplicate === "blocked" && (
          <Notice
            tone="hold"
            title="Nothing new was created"
            live
            className="mt-6"
          >
            What you submitted exactly matches this existing obligation, so the
            duplicate was blocked. This is the existing record.
          </Notice>
        )}
        {notice.duplicate === "resolved" && (
          <Notice
            tone="done"
            title="Duplicate finding resolved"
            live
            className="mt-6"
          >
            Your note was added to the audit history.
          </Notice>
        )}
        {notice.controls === "evaluated" && (
          <Notice tone="info" title="Controls evaluated" live className="mt-6">
            The result is under Control below. Evaluating controls approves
            nothing by itself.
          </Notice>
        )}
        {notice.approval === "recorded" && (
          <Notice
            tone="info"
            title="Your decision was recorded"
            live
            className="mt-6"
          >
            See Approvals below for what is still required. An approval is
            business authorization only; nothing has been signed or paid.
          </Notice>
        )}
        {notice.readiness === "evaluated" && (
          <Notice tone="info" title="Readiness evaluated" live className="mt-6">
            The result is under Settlement readiness below.
          </Notice>
        )}
        <section className="summary mt-6" aria-label="Summary">
          <div>
            <p className="fact-label">Amount owed</p>
            <p className="figure mt-2">
              {formatMinorUnits(o.amountMinor, o.currency)}
            </p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Fact label="Vendor">
              {vendor ? (
                <Link
                  href={`/app/vendors/${vendor.id}`}
                  className="underline decoration-[#d9a43e] decoration-2"
                >
                  {vendor.displayName}
                </Link>
              ) : (
                "No vendor"
              )}
            </Fact>
            <Fact label="Due">
              {o.dueAt?.toLocaleDateString() ?? "Not set"}
            </Fact>
            <Fact label="Next step">
              {nextStep ?? "Nothing is waiting on a person"}
            </Fact>
          </dl>
        </section>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <section className="card p-6">
            <h2 className="font-semibold">Business details</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <Detail label="Type" value={stateLabel(o.type)} />
              <Detail label="Category" value={o.category ?? "—"} />
              <Detail
                label="Source"
                value={source ? stateLabel(source.kind) : "—"}
              />
              <Detail
                label="Purpose"
                value={o.description}
                className="sm:col-span-2"
              />
            </dl>
          </section>
          <section className="card p-6">
            <h2 className="font-semibold">Control boundary</h2>
            <div className="mt-5 space-y-4">
              <Row
                label="Duplicate findings"
                value={
                  openDuplicates.length
                    ? `${openDuplicates.length} to review`
                    : "None open"
                }
              />
              <Row
                label="Policy decision"
                value={
                  control.decision
                    ? stateLabel(control.decision.result)
                    : "Not evaluated"
                }
              />
              <Row
                label="Approvals"
                value={
                  control.requirements.length
                    ? `${approved} of ${control.requirements.length} requirements met`
                    : "Not requested"
                }
              />
              <Row
                label="Settlement readiness"
                value={o.state === "READY_TO_SETTLE" ? "Ready" : "Not ready"}
              />
            </div>
            <p className="text-muted mt-5 text-xs leading-5">
              Business authorization never constitutes a wallet signature. Phase
              4 requires a separate external Zallet ceremony.
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
              <SubmitButton
                className="button button-light"
                pendingLabel="Evaluating…"
              >
                {control.decision
                  ? "Re-evaluate controls"
                  : "Evaluate controls"}
              </SubmitButton>
            </form>
          </div>
          {!control.decision ? (
            <p className="text-muted p-6 text-sm">
              Controls have not been evaluated, so the obligation stays under
              review. Evaluate controls to see what it needs.
            </p>
          ) : !control.findings.length ? (
            <p className="text-muted p-6 text-sm">
              The decision recorded no individual findings.
            </p>
          ) : (
            <ul className="divide-y">
              {control.findings.map((f) => (
                <li
                  key={f.id}
                  className="grid gap-2 p-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-start"
                >
                  <div>
                    <StateTag state={f.outcome} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm">{f.message}</p>
                    <p className="text-ink-3 mt-1 font-mono text-xs break-all">
                      {f.code}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
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
              No approval is required right now. Requirements appear here after
              controls are evaluated.
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
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <strong>{stateLabel(req.role)} approval</strong>
                          <StateTag state={req.state} />
                        </div>
                        <p className="text-muted mt-2 text-xs">
                          {req.reason} · {req.approvedCount} of{" "}
                          {req.requiredCount} given
                        </p>
                        {req.prohibitCreator && (
                          <p className="text-hold mt-1 text-xs font-medium">
                            The person who requested this cannot approve it.
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
                            <label className="text-xs font-semibold">
                              Note (optional)
                              <input
                                name="note"
                                className="mt-1 block min-h-11 rounded-lg border px-3 text-sm font-normal"
                              />
                            </label>
                            <SubmitButton
                              name="decision"
                              value="REJECT"
                              className="button button-light"
                              pendingLabel="Rejecting…"
                            >
                              Reject
                            </SubmitButton>
                            <SubmitButton
                              name="decision"
                              value="APPROVE"
                              pendingLabel="Approving…"
                            >
                              Approve
                            </SubmitButton>
                          </form>
                        )}
                      {req.state === "PENDING" &&
                        (!canAct || creatorRestricted) && (
                          <span className="text-muted text-xs">
                            {creatorRestricted
                              ? "You requested this, so you cannot decide it"
                              : `Your role cannot decide this; it needs ${stateLabel(req.role)}`}
                          </span>
                        )}
                    </div>
                    {approvals.map((item) => (
                      <p
                        key={item.approval.id}
                        className="text-muted mt-3 text-xs"
                      >
                        {item.approval.decision === "APPROVE"
                          ? "Approved"
                          : "Rejected"}{" "}
                        by{" "}
                        {item.user?.displayName ??
                          item.user?.email ??
                          "an unknown user"}{" "}
                        · {item.approval.createdAt.toLocaleString()}
                        {item.approval.invalidatedAt &&
                          " · invalidated, no longer counts"}
                      </p>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </section>
        {openDuplicates.map((d) => (
          <section className="notice notice-hold mt-5" key={d.id}>
            <span className="glyph glyph-attn" aria-hidden />
            <div>
              <h2 className="font-semibold">
                Possible duplicate needs a decision
              </h2>
              <p className="mt-1 text-sm">
                This looks like{" "}
                <Link
                  href={`/app/obligations/${d.candidateObligationId}`}
                  className="font-semibold underline"
                >
                  obligation {d.candidateObligationId.slice(0, 8)}…
                </Link>
                . Compare the two before you continue, so the vendor is not paid
                twice.
              </p>
              <form
                action={resolveDuplicateAction.bind(null, id, d.id)}
                className="mt-4 flex flex-wrap items-end gap-2"
              >
                <label className="min-w-0 flex-1 basis-64 text-xs font-semibold">
                  Why this is a separate obligation
                  <input
                    className="mt-1 block min-h-11 w-full rounded-lg border px-3 text-sm font-normal"
                    name="note"
                    required
                    minLength={3}
                  />
                </label>
                <SubmitButton pendingLabel="Resolving…">
                  Resolve as distinct
                </SubmitButton>
              </form>
            </div>
          </section>
        ))}
        <section className="card mt-5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">Settlement readiness</h2>
              {control.readiness ? (
                <p className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                  <StateTag state={control.readiness.result} />
                  <span className="text-muted">
                    Evaluated {control.readiness.evaluatedAt.toLocaleString()}
                  </span>
                </p>
              ) : (
                <p className="text-muted mt-2 text-sm">
                  Not evaluated.
                  {o.state !== "APPROVED" &&
                    o.state !== "READY_TO_SETTLE" &&
                    " Readiness can be evaluated once the obligation is approved."}
                </p>
              )}
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
                <p className="text-hold mt-3 text-sm font-semibold">
                  Ready to settle, not paid. An exact intent may be prepared.
                  Obliq still cannot sign independently.
                </p>
              )}
            </div>
            <form action={readinessAction.bind(null, id)}>
              <SubmitButton
                disabled={o.state !== "APPROVED"}
                pendingLabel="Evaluating…"
              >
                Evaluate readiness
              </SubmitButton>
            </form>
          </div>
          {o.state === "READY_TO_SETTLE" && !settlement && (
            <form
              action={createSettlementIntentAction.bind(null, id)}
              className="mt-6 border-t pt-5"
            >
              <input type="hidden" name="idempotencyKey" value={randomUUID()} />
              <label className="text-xs font-semibold" htmlFor="zatoshiAmount">
                Controlled regtest quote — exact zatoshi amount
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  id="zatoshiAmount"
                  name="zatoshiAmount"
                  inputMode="numeric"
                  pattern="[1-9][0-9]*"
                  required
                  aria-describedby="zatoshi-hint"
                  className="min-h-11 min-w-0 flex-1 basis-48 rounded-lg border px-3 font-mono text-sm"
                  placeholder="25000000"
                />
                <SubmitButton pendingLabel="Preparing…">
                  Prepare exact intent
                </SubmitButton>
              </div>
              <p id="zatoshi-hint" className="text-muted mt-2 text-xs">
                Whole zatoshis, no decimal point (100,000,000 zatoshis is 1
                ZEC). Seeded and controlled: this is not live market pricing.
                The quote expires after 15 minutes.
              </p>
            </form>
          )}
          {settlement && (
            <div className="mt-6 border-t pt-5">
              <p className="flex flex-wrap items-center gap-3 text-sm font-semibold">
                Settlement
                <StateTag state={settlement.settlement.state} />
              </p>
              <Link
                href={`/app/settlements/${settlement.settlement.id}`}
                className="button button-light mt-3"
              >
                Open signing review
              </Link>
            </div>
          )}
        </section>
        <section className="card mt-5 overflow-hidden">
          <div className="hairline flex flex-wrap items-start justify-between gap-4 border-b p-5">
            <div>
              <h2 className="font-semibold">Shielded observation</h2>
              <p className="text-muted mt-1 text-xs">
                Read-only reconciliation evidence. This surface cannot create,
                sign or broadcast a transaction.
              </p>
            </div>
            <span className="tag">
              <span
                className={observerStatus ? "glyph" : "glyph glyph-unknown"}
                aria-hidden
              />
              Observer:{" "}
              {observerStatus
                ? stateLabel(observerStatus.availability)
                : "Not configured"}
            </span>
          </div>
          {!observations.length ? (
            <p className="text-muted p-6 text-sm">
              No shielded output has been matched to this obligation. Being
              ready to settle is not evidence of payment.
            </p>
          ) : (
            <div className="divide-y">
              {observations.map((observation) => (
                <div
                  key={observation.id}
                  className="grid gap-4 p-5 sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <StateTag state={observation.state} />
                      <span className="text-sm font-semibold">
                        {stateLabel(observation.correlationStatus)}
                      </span>
                    </div>
                    <p className="text-muted mt-2 font-mono text-xs break-all">
                      {observation.network} · {observation.pool} · tx{" "}
                      {observation.txid.slice(0, 12)}… · output{" "}
                      {observation.outputIndex}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm font-semibold">
                      {observation.confirmations} confirmation(s)
                    </p>
                    <p className="text-muted mt-1 text-xs">
                      height {observation.blockHeight?.toString() ?? "unknown"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="card mt-5 overflow-hidden">
          <div className="hairline border-b p-5">
            <h2 className="font-semibold">Activity history</h2>
            <p className="text-muted mt-1 text-xs">
              Organization-scoped, hash-chained audit events.
            </p>
          </div>
          {activity.length ? (
            <ol>
              {activity.map((e) => (
                <li
                  key={e.id}
                  className="hairline flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-t p-5 text-sm first:border-t-0"
                >
                  <div className="min-w-0">
                    <strong>{stateLabel(e.eventType)}</strong>
                    <p className="text-muted mt-1 text-xs break-all">
                      Actor {e.actorId ? `${e.actorId.slice(0, 8)}…` : "system"}{" "}
                      · hash {e.payloadHash.slice(0, 12)}…
                    </p>
                  </div>
                  <time
                    className="text-muted text-xs"
                    dateTime={e.createdAt.toISOString()}
                  >
                    {e.createdAt.toLocaleString()}
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-muted p-5 text-sm">No events recorded yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}
function Detail({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
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
