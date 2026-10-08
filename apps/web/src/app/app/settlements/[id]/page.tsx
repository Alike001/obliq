import { formatMinorUnits } from "@obliq/domain";
import {
  createExternalSignerHandoff,
  formatZecAmount,
  receiverFingerprint,
} from "@obliq/zcash";
import { getSettlement, listObligationObservations } from "@obliq/database";
import { notFound } from "next/navigation";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { Field, Input, Select } from "@/components/finance-form";
import { Notice } from "@/components/notice";
import { BackLink, Fact } from "@/components/record";
import { StateTag } from "@/components/state-tag";
import { stateLabel } from "@/components/state-tone";
import { SubmitButton } from "@/components/submit-button";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import {
  recordBroadcastReceiptAction,
  recordSigningFailureAction,
  recordSigningReceiptAction,
  requestExternalSignatureAction,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function SettlementDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ signing?: string; broadcast?: string }>;
}) {
  const { id } = await params;
  const notice = await searchParams;
  const tenant = await getTenantContext();
  const record = await getSettlement(getDatabase(), tenant.organizationId, id);
  if (!record) notFound();
  const { settlement, intent, quote, obligation, vendor } = record;
  const observations = await listObligationObservations(
    getDatabase(),
    tenant.organizationId,
    obligation.id,
  );
  const handoff = createExternalSignerHandoff({
    intentId: intent.id,
    intentHash: intent.intentHash,
    network: "regtest",
    receiver: intent.destinationReceiver,
    amountZat: intent.zatoshiAmount,
    quoteExpiresAt: intent.quoteExpiresAt,
  });
  const receiverPrint = receiverFingerprint(intent.destinationReceiver);
  const canRequest =
    settlement.state === "AWAITING_SIGNATURE" &&
    !settlement.signerRequestId &&
    intent.quoteExpiresAt > new Date();
  const quoteExpired =
    settlement.state === "AWAITING_SIGNATURE" &&
    intent.quoteExpiresAt <= new Date();
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <BackLink href="/app/settlements" label="Settlements" />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Signing review</p>
            <h1 className="mt-3 text-3xl font-medium">
              {obligation.reference}
            </h1>
            <p className="text-muted mt-2 text-sm">
              Intent {intent.intentHash.slice(0, 16)}… · immutable version{" "}
              {intent.intentVersion}
            </p>
          </div>
          <StateTag state={settlement.state} />
        </div>
        {notice.signing === "requested" && (
          <Notice
            tone="hold"
            title="Signing review started, nothing signed"
            live
            className="mt-6"
          >
            Carry the request to your external signer. When the ceremony ends,
            record its outcome below.
          </Notice>
        )}
        {notice.signing === "recorded" && (
          <Notice
            tone="hold"
            title="External authorization recorded, not yet settled"
            live
            className="mt-6"
          >
            The transaction still has to be broadcast and then seen by the
            read-only observer before this counts as settled.
          </Notice>
        )}
        {notice.signing === "closed" && (
          <Notice
            tone="info"
            title="Non-success outcome recorded"
            live
            className="mt-6"
          >
            Nothing was signed under this request. The current state is shown
            above.
          </Notice>
        )}
        {notice.broadcast === "recorded" && (
          <Notice
            tone="hold"
            title="Broadcast outcome recorded, not yet settled"
            live
            className="mt-6"
          >
            Recording an outcome does not confirm payment. Only the read-only
            observer can mark this settled.
          </Notice>
        )}
        <section className="summary mt-6" aria-label="Summary">
          <div>
            <p className="fact-label">Shielded amount</p>
            <p className="figure mt-2">
              {formatZecAmount(intent.zatoshiAmount)} ZEC
            </p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-3">
            <Fact label="Business amount">
              {formatMinorUnits(
                intent.businessAmountMinor,
                intent.businessCurrency,
              )}
            </Fact>
            <Fact label="Vendor">{vendor.displayName}</Fact>
            <Fact label="Obligation">
              <Link
                href={`/app/obligations/${obligation.id}`}
                className="underline decoration-[#d9a43e] decoration-2"
              >
                {obligation.reference}
              </Link>
            </Fact>
          </dl>
        </section>
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <section className="card p-6">
            <h2 className="font-semibold">What is being authorized</h2>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <Detail label="Network" value="Regtest, not a public network" />
              <Detail
                label="Quote"
                value={`${quote.source} · expires ${quote.expiresAt.toLocaleString()}`}
              />
              <Detail
                label="Privacy policy"
                value="FullPrivacy · shielded-only"
              />
              <Detail
                label="Destination fingerprint"
                value={`${receiverPrint.slice(0, 16)}…${receiverPrint.slice(-8)}`}
              />
              <Detail
                label="Approval binding"
                value={`obligation v${intent.obligationVersion} · decision ${intent.policyDecisionId.slice(0, 8)}…`}
              />
            </dl>
            <Notice
              tone="hold"
              title="Business approval does not sign this transaction"
              className="mt-6 text-sm"
            >
              Review these exact values in the external Zallet PCZT inspection
              before authorizing it.
            </Notice>
          </section>
          <section className="card p-6">
            <h2 className="font-semibold">External signer handoff</h2>
            <p className="text-muted mt-2 text-xs leading-5">
              The operator transfers this canonical request to an isolated
              Zallet. Obliq never receives the PCZT, raw transaction, mnemonic,
              passphrase, or spending key.
            </p>
            <p className="mt-5 text-xs font-semibold">ZIP-321 request</p>
            <code className="code-block mt-2" tabIndex={0}>
              {handoff.paymentRequest}
            </code>
            {canRequest && (
              <form
                action={requestExternalSignatureAction.bind(
                  null,
                  settlement.id,
                )}
                className="mt-5"
              >
                <input
                  type="hidden"
                  name="signerRequestId"
                  value={randomUUID()}
                />
                <SubmitButton pendingLabel="Starting…">
                  Begin deliberate signing review
                </SubmitButton>
              </form>
            )}
            {quoteExpired && (
              <Notice
                tone="stop"
                title="Quote expired, this intent cannot be signed"
                className="mt-5 text-sm"
              >
                It expired {intent.quoteExpiresAt.toLocaleString()}. Nothing was
                signed or paid. A new intent with a fresh quote is needed.
              </Notice>
            )}
          </section>
        </div>
        {settlement.state === "AWAITING_SIGNATURE" &&
          settlement.signerRequestId && (
            <section className="card mt-5 p-6">
              <h2 className="font-semibold">
                Record sanitized signing receipt
              </h2>
              <p className="text-muted mt-2 text-xs">
                Only metadata from the external ceremony belongs here. Never
                paste a PCZT, raw transaction, key, seed, or passphrase.
              </p>
              <form
                action={recordSigningReceiptAction.bind(
                  null,
                  settlement.id,
                  settlement.signerRequestId,
                )}
                className="mt-5 grid gap-3 md:grid-cols-3"
              >
                <Field label="Transaction ID" hint="64 hexadecimal characters.">
                  <Input
                    name="txid"
                    pattern="[0-9a-fA-F]{64}"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono"
                  />
                </Field>
                <Field
                  label="Signed transaction hash"
                  hint="64 hexadecimal characters."
                >
                  <Input
                    name="signedTxHash"
                    pattern="[0-9a-fA-F]{64}"
                    required
                    autoComplete="off"
                    spellCheck={false}
                    className="font-mono"
                  />
                </Field>
                <Field label="Zallet version">
                  <Input name="signerVersion" required autoComplete="off" />
                </Field>
                <div className="md:col-span-3">
                  <SubmitButton pendingLabel="Recording…">
                    Record external authorization
                  </SubmitButton>
                </div>
              </form>
              <form
                action={recordSigningFailureAction.bind(
                  null,
                  settlement.id,
                  settlement.signerRequestId,
                )}
                className="mt-6 grid gap-3 border-t pt-5 md:grid-cols-2"
              >
                <h3 className="text-sm font-semibold md:col-span-2">
                  Or, if signing did not succeed
                </h3>
                <Field label="Non-success outcome">
                  <Select name="outcome">
                    <option value="REJECTED">User rejected signing</option>
                    <option value="UNAVAILABLE">Signer unavailable</option>
                    <option value="FAILED">Signing failed</option>
                  </Select>
                </Field>
                <Field
                  label="Safe error code"
                  hint="A short code only. Never a key, seed or transaction."
                >
                  <Input name="errorCode" required autoComplete="off" />
                </Field>
                <div className="md:col-span-2">
                  <SubmitButton
                    className="button button-light"
                    pendingLabel="Recording…"
                  >
                    Record non-success outcome
                  </SubmitButton>
                </div>
              </form>
            </section>
          )}
        {(settlement.state === "SIGNED" ||
          settlement.state === "BROADCAST_UNKNOWN") &&
          settlement.txRefPrivate && (
            <section className="card mt-5 p-6">
              <h2 className="font-semibold">Record broadcast outcome</h2>
              <p className="text-muted mt-2 text-xs">
                A timeout is Unknown: not a failure, and never settlement. The
                read-only observer determines detection and confirmation.
              </p>
              <form
                action={recordBroadcastReceiptAction.bind(null, settlement.id)}
                className="mt-5 grid gap-3 md:grid-cols-2"
              >
                <input
                  type="hidden"
                  name="txid"
                  value={settlement.txRefPrivate}
                />
                <input
                  type="hidden"
                  name="broadcastRequestId"
                  value={settlement.broadcastRequestId ?? randomUUID()}
                />
                <Field label="Outcome">
                  <Select name="outcome">
                    <option value="BROADCAST">Broadcast accepted</option>
                    <option value="UNKNOWN">Unknown (timed out)</option>
                    <option value="FAILED">Broadcast failed</option>
                  </Select>
                </Field>
                <div className="md:col-span-2">
                  <SubmitButton pendingLabel="Recording…">
                    Record outcome
                  </SubmitButton>
                </div>
              </form>
            </section>
          )}
        <section className="card mt-5 overflow-hidden">
          <div className="border-b p-5">
            <h2 className="font-semibold">Execution and reconciliation</h2>
          </div>
          <dl className="grid gap-4 p-5 sm:grid-cols-3">
            <Detail
              label="Signing"
              value={
                settlement.signedAt
                  ? `Signed · ${settlement.signerType}`
                  : stateLabel(settlement.state)
              }
            />
            <Detail
              label="Broadcast"
              value={
                settlement.broadcastAt
                  ? stateLabel(settlement.state)
                  : "Not broadcast"
              }
            />
            <Detail
              label="Observer evidence"
              value={
                observations[0]
                  ? `${stateLabel(observations[0].state)} · ${observations[0].confirmations} confirmations`
                  : "Not observed"
              }
            />
          </dl>
          <p className="text-muted hairline border-t px-5 py-4 text-xs">
            Only observer evidence can make this settled. A recorded signature
            or broadcast is not proof of payment.
          </p>
        </section>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="fact-label">{label}</dt>
      <dd className="fact-value">{value}</dd>
    </div>
  );
}
