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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/app/settlements" className="text-muted text-sm">
          ← Settlements
        </Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
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
          <span className="rounded-full bg-stone-100 px-3 py-1 font-mono text-xs font-semibold">
            {settlement.state}
          </span>
        </div>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <section className="card p-6">
            <h2 className="font-semibold">What is being authorized</h2>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <Detail label="Vendor" value={vendor.displayName} />
              <Detail
                label="Business amount"
                value={formatMinorUnits(
                  intent.businessAmountMinor,
                  intent.businessCurrency,
                )}
              />
              <Detail
                label="Shielded amount"
                value={`${formatZecAmount(intent.zatoshiAmount)} ZEC`}
              />
              <Detail label="Network" value="REGTEST — not public network" />
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
            <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm leading-6">
              Business approval does not sign this transaction. Review these
              exact values in the external Zallet PCZT inspection before
              authorizing it.
            </div>
          </section>
          <section className="card p-6">
            <h2 className="font-semibold">External signer handoff</h2>
            <p className="text-muted mt-2 text-xs leading-5">
              The operator transfers this canonical request to an isolated
              Zallet. Obliq never receives the PCZT, raw transaction, mnemonic,
              passphrase, or spending key.
            </p>
            <p className="mt-5 text-xs font-semibold">ZIP-321 request</p>
            <code className="mt-2 block max-h-28 overflow-auto rounded-lg bg-stone-950 p-3 text-[11px] break-all text-stone-100">
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
                <button className="button button-dark">
                  Begin deliberate signing review
                </button>
              </form>
            )}
            {settlement.state === "AWAITING_SIGNATURE" &&
              intent.quoteExpiresAt <= new Date() && (
                <p className="mt-5 text-sm font-semibold text-red-800">
                  Quote expired. Re-quote; this intent cannot be signed.
                </p>
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
                <Input
                  name="txid"
                  label="Transaction ID"
                  pattern="[0-9a-fA-F]{64}"
                />
                <Input
                  name="signedTxHash"
                  label="Signed transaction hash"
                  pattern="[0-9a-fA-F]{64}"
                />
                <Input name="signerVersion" label="Zallet version" />
                <button className="button button-dark md:col-span-3">
                  Record external authorization
                </button>
              </form>
              <form
                action={recordSigningFailureAction.bind(
                  null,
                  settlement.id,
                  settlement.signerRequestId,
                )}
                className="mt-6 grid gap-3 border-t pt-5 md:grid-cols-2"
              >
                <label className="text-xs">
                  Non-success outcome
                  <select
                    name="outcome"
                    className="mt-2 min-h-11 w-full rounded-lg border px-3"
                  >
                    <option value="REJECTED">User rejected signing</option>
                    <option value="UNAVAILABLE">Signer unavailable</option>
                    <option value="FAILED">Signing failed</option>
                  </select>
                </label>
                <Input name="errorCode" label="Safe error code" />
                <button className="button md:col-span-2">
                  Record non-success outcome
                </button>
              </form>
            </section>
          )}
        {(settlement.state === "SIGNED" ||
          settlement.state === "BROADCAST_UNKNOWN") &&
          settlement.txRefPrivate && (
            <section className="card mt-5 p-6">
              <h2 className="font-semibold">Record broadcast outcome</h2>
              <p className="text-muted mt-2 text-xs">
                A timeout is UNKNOWN—not failure and never settlement. The
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
                <label className="text-xs">
                  Outcome
                  <select
                    name="outcome"
                    className="mt-2 min-h-11 w-full rounded-lg border px-3"
                  >
                    <option>BROADCAST</option>
                    <option>UNKNOWN</option>
                    <option>FAILED</option>
                  </select>
                </label>
                <button className="button button-dark md:col-span-2">
                  Record outcome
                </button>
              </form>
            </section>
          )}
        <section className="card mt-5 overflow-hidden">
          <div className="border-b p-5">
            <h2 className="font-semibold">Execution and reconciliation</h2>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <Detail
              label="Signing"
              value={
                settlement.signedAt
                  ? `SIGNED · ${settlement.signerType}`
                  : settlement.state
              }
            />
            <Detail
              label="Broadcast"
              value={
                settlement.broadcastAt ? settlement.state : "NOT BROADCAST"
              }
            />
            <Detail
              label="Observer evidence"
              value={
                observations[0]
                  ? `${observations[0].state} · ${observations[0].confirmations} confirmations`
                  : "NOT OBSERVED"
              }
            />
          </div>
        </section>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="mt-1 text-sm font-medium break-all">{value}</dd>
    </div>
  );
}
function Input({
  name,
  label,
  pattern,
}: {
  name: string;
  label: string;
  pattern?: string;
}) {
  return (
    <label className="text-xs">
      {label}
      <input
        name={name}
        pattern={pattern}
        required
        className="mt-2 min-h-11 w-full rounded-lg border px-3 font-mono text-sm"
      />
    </label>
  );
}
