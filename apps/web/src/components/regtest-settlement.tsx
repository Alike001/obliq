import { formatZecAmount } from "@obliq/zcash";
import { phase3NetworkProof } from "@/content/phase3-proof";
import { phase4NetworkProof } from "@/content/phase4-proof";
import { ScopeTag } from "./status-pill";

const run = phase4NetworkProof;
const tracer = phase3NetworkProof;
const amount = `${formatZecAmount(BigInt(run.amountZat))} ZEC`;
const zatoshis = Number(run.amountZat).toLocaleString("en-US");
const [firstSeen, lastSeen] = run.confirmationEvidence;

// Every value below is read from the recorded evidence of the one regtest
// run. Nothing here is computed at request time or stands for a live payment.
const stages = [
  {
    title: "An exact payment was fixed in Obliq",
    lane: "Business approval",
    text: "After approval, Obliq prepared one payment request: an exact amount, one destination and an opaque memo reference, bound together by a hash that cannot be edited afterwards.",
    facts: [
      ["Intent hash", run.intentHash, "hash"],
      ["Amount", `${amount} (${zatoshis} zatoshis)`],
      ["Quote", `${run.quoteSource}. A fixed test quote, not market pricing`],
    ],
  },
  {
    title: "It was signed outside Obliq",
    lane: "Signature, on the operator's own signer",
    text: "Zallet created, inspected, proved, signed and extracted an Ironwood PCZT outside Obliq. No RPC credential, PCZT, raw transaction or key entered the app.",
    facts: [
      ["Signer", run.signer],
      ["Privacy policy", `${run.privacyPolicy}, shielded only`],
      ["Obliq's spending authority", run.backendSpendingAuthority],
    ],
  },
  {
    title: "It was broadcast and mined",
    lane: "Signature, on the operator's own signer",
    text: "The signed transaction went to the regtest node and was mined. A broadcast is recorded as a broadcast. It is never treated as settlement.",
    facts: [
      ["Transaction ID", run.txid, "hash"],
      ["Pool", run.pool],
      ["Mined at height", String(run.minedHeight)],
      ["Node", run.node],
    ],
  },
  {
    title: "A read-only observer saw it arrive",
    lane: "Observation",
    text: "A separate observer that holds a viewing key, and nothing that can spend, decrypted the output and matched it to the intent by receiver, memo reference and exact amount.",
    facts: [
      ["Confirmations seen", `${firstSeen}, then ${lastSeen}`],
      ["Match", run.correlation],
      ["Observer", run.observer],
      ["Data service", run.dataService],
    ],
  },
  {
    title: "Only then was it marked settled",
    lane: "Observation",
    text: "The observer's evidence moved the record to its final state. A recorded signature or broadcast cannot do that.",
    facts: [["Final state", run.finalState]],
  },
] as const;

/**
 * The one end-to-end settlement Obliq has evidence for, laid out in the order
 * it happened. It ran on regtest, and the section says so at every level.
 */
export function RegtestSettlement() {
  return (
    <section className="page-wrap pt-16" aria-labelledby="run-h">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="run-h" className="text-2xl font-semibold tracking-tight">
          One payment, followed from intent to settled
        </h2>
        <ScopeTag />
      </div>
      <p className="mt-3 max-w-[68ch] leading-7">
        <strong>
          One shielded payment of {amount} has been taken through the whole
          lifecycle.
        </strong>{" "}
        <span className="text-muted">
          It ran on regtest, an isolated test network whose coins have no value.
          These are the recorded facts from that run, in the order they
          happened.
        </span>
      </p>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_.65fr] lg:items-start">
        <ol className="sheet steps">
          {stages.map((stage) => (
            <li key={stage.title} data-state="done">
              <div className="min-w-0">
                <p className="fact-label">{stage.lane}</p>
                <h3 className="mt-1 font-semibold">{stage.title}</h3>
                <p className="text-muted mt-2 text-sm leading-6">
                  {stage.text}
                </p>
                <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  {stage.facts.map(([label, value, kind]) => (
                    <div
                      key={label}
                      className={kind === "hash" ? "sm:col-span-2" : undefined}
                    >
                      <dt className="text-ink-3 text-xs">{label}</dt>
                      <dd
                        className={
                          kind === "hash"
                            ? "mt-1 font-mono text-xs leading-5 break-all"
                            : "mt-1 text-sm font-medium wrap-anywhere"
                        }
                      >
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </li>
          ))}
        </ol>
        <div className="space-y-5">
          <div className="notice notice-hatched" role="note">
            <span className="glyph glyph-attn" aria-hidden />
            <div>
              <strong>What this run does not show</strong>
              <p>
                It does not show synchronization with a public network, a funded
                payment on public testnet, or anything on mainnet. A regtest
                transaction exists only on the machine that ran it, so it cannot
                be looked up in a public block explorer.
              </p>
            </div>
          </div>
          <article className="card bg-panel p-5">
            <h3 className="text-muted text-xs font-normal">
              Who held spending authority
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <dt className="text-muted">Obliq&rsquo;s backend</dt>
                <dd className="font-mono font-semibold">
                  {run.backendSpendingAuthority}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <dt className="text-muted">The observer</dt>
                <dd className="font-mono font-semibold">
                  {tracer.spendingAuthority}
                </dd>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                <dt className="text-muted">The external signer</dt>
                <dd className="font-semibold">The only one</dd>
              </div>
            </dl>
          </article>
          <article className="card bg-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-muted text-xs font-normal">
                An earlier read-only run
              </h3>
              <ScopeTag />
            </div>
            <p className="text-muted mt-4 text-sm leading-6">
              Before the end-to-end run, the observer alone was pointed at a
              mined {tracer.pool === "IRONWOOD" ? "Ironwood" : tracer.pool}{" "}
              output of {formatZecAmount(BigInt(tracer.amountZat))} ZEC. It
              matched the payment with a viewing key and no spending authority.
            </p>
            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-ink-3 text-xs">Transaction ID</dt>
                <dd className="mt-1 font-mono text-xs leading-5 break-all">
                  {tracer.txid}
                </dd>
              </div>
              <div>
                <dt className="text-ink-3 text-xs">Height and confirmations</dt>
                <dd className="mt-1 text-sm font-medium">
                  {tracer.minedHeight} · {tracer.confirmationEvidence[0]}, then{" "}
                  {tracer.confirmationEvidence[1]}
                </dd>
              </div>
              <div>
                <dt className="text-ink-3 text-xs">Evidence captured</dt>
                <dd className="mt-1 text-sm font-medium">
                  <time dateTime={tracer.evidenceCapturedAt}>
                    {tracer.evidenceCapturedAt.replace("T", " ").slice(0, 16)}{" "}
                    UTC
                  </time>
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </div>
    </section>
  );
}
