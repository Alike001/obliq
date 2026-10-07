import type { ImplementationStatus } from "@obliq/domain";
import Link from "next/link";
import { AuthorityTrack } from "@/components/authority-track";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { NetworkStamp, StatusPill } from "@/components/status-pill";
import { networkClaims, networkSummary } from "@/lib/network-claims";
import { readNetworkStatus } from "@/lib/network-status";
import { isReadOnlyPreview, siteLinks } from "@/lib/site-links";

// Network claims come from runtime configuration, not from this file.
export const dynamic = "force-dynamic";

const exposed = [
  ["Who you pay", "Every vendor and contractor, linked to your treasury."],
  ["How much", "Each amount, so anyone can total what a supplier earns."],
  ["How often", "The rhythm of your payables, to anyone who is watching."],
] as const;

const zcashReasons = [
  [
    "Private on chain",
    "A shielded payment encrypts sender, receiver, amount and memo.",
  ],
  [
    "Still reconcilable",
    "A viewing key lets your observer see the payment without being able to spend.",
  ],
  [
    "No transparent fallback",
    "If a shielded path cannot be proven, Obliq stops. It never falls back to a public payment.",
  ],
] as const;

const holds = [
  "Your business records: vendors, bills, policy decisions, approvals and audit history",
  "A viewing key, inside a separate read-only observer. It cannot spend, but it is sensitive secret material",
  "The evidence it issues, with a hash of the exact content",
] as const;

const neverHolds = [
  "A seed phrase or private spending key",
  "Your signer's credentials",
  "A PCZT or raw transaction",
  "AI with authority. AI cannot approve, sign or broadcast",
] as const;

// Product capabilities mirror the register on /proof.
const product = [
  ["Bill capture with human review", "IMPLEMENTED"],
  ["Policy engine and approval workflow", "IMPLEMENTED"],
  ["Controlled evidence and verification", "IMPLEMENTED"],
  ["Invoice field extraction", "SEEDED"],
  ["Native evidence PDF", "PLANNED"],
  ["Zero-knowledge business proof", "UNAVAILABLE"],
] as const satisfies readonly (readonly [string, ImplementationStatus])[];

const firstSteps = [
  [
    "Add a vendor",
    "Every bill is owed to someone. Start with one vendor record.",
    "/app/vendors/new",
  ],
  [
    "Record and verify its payment destination",
    "Save the vendor's shielded receiver, then record how you confirmed it. A recorded destination is not a verified one.",
    "/app/vendors",
  ],
  [
    "Set the payment policy",
    "Amount tiers decide who must approve each bill.",
    "/app/policies",
  ],
  [
    "Record your first obligation",
    "Enter the bill, evaluate policy, and collect the approvals it asks for.",
    "/app/obligations/new",
  ],
] as const;

export default function LandingPage() {
  const { status, network } = readNetworkStatus();
  const claims = networkClaims(status, network);
  const summary = networkSummary(status);
  const preview = isReadOnlyPreview();
  const { primary, secondary } = siteLinks(preview);
  return (
    <>
      <a href="#main" className="button button-dark skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main id="main">
        <section className="page-wrap pt-14 pb-12 lg:pt-[4.5rem]">
          <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
            <h1 className="t-display max-w-[17ch]">
              Pay your business bills without publishing your business.
            </h1>
            <div className="grid gap-5">
              <p className="t-lede">
                Obliq is accounts payable for crypto-native finance teams.
                Capture a bill, control it with policy and approvals, settle it
                in shielded Zcash from a signer you operate, reconcile the
                payment back to the bill, and prove it with evidence you choose
                to disclose.
              </p>
              <p className="t-lede">
                <strong className="text-ink">
                  Obliq never holds a spending key.
                </strong>{" "}
                It can record an approval. It cannot sign a payment.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href={primary.href} className="button button-dark">
                  {primary.label}
                </Link>
                <Link href={secondary.href} className="button button-light">
                  {secondary.label}
                </Link>
              </div>
            </div>
          </div>
          <div className="mt-10 grid gap-3">
            {preview && (
              <div className="notice notice-hold" role="note">
                <span className="glyph glyph-attn" aria-hidden />
                <div>
                  <strong>This is a read-only preview.</strong>
                  <p>
                    The workspace, sign-in and evidence verification are not
                    available here. Nothing on this site can record, approve or
                    move a payment.
                  </p>
                </div>
              </div>
            )}
            <div className="notice notice-hatched" role="note">
              <span className="glyph glyph-attn" aria-hidden />
              <div>
                <strong>{summary.lead}</strong>
                <p>{summary.rest}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="band band-surface" aria-labelledby="lanes-h">
          <div className="page-wrap">
            <h2 className="t-title" id="lanes-h">
              One bill, five steps, three authorities
            </h2>
            <p className="t-lede mt-3">
              A bill crosses from one lane to the next only by a deliberate
              hand-off. No lane can act for another, and an approved bill has
              not been paid until your signer signs it and the observer sees it
              settle.
            </p>
            <div className="mt-8">
              <AuthorityTrack />
            </div>
            <p className="t-small mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className="border-line-strong inline-block h-4 w-8 rounded-[2px] border border-dashed bg-(image:--hatch)"
                aria-hidden
              />
              A hatched step is verified on regtest, an isolated test network,
              and not on a public network.
            </p>
            <Link href="/docs/product-lifecycle" className="text-link mt-4">
              Read the lifecycle in detail
            </Link>
          </div>
        </section>

        <section className="band" aria-labelledby="problem-h">
          <div className="page-wrap cols-2">
            <div>
              <h2 className="t-title" id="problem-h">
                On a public chain, your payables are public
              </h2>
              <p className="t-lede mt-3">
                Paying a supplier from a transparent address tells every
                observer about the relationship. Obliq keeps the bill, the
                approvals and the reasons in your own records, and settles
                through shielded Zcash so the payment does not publish them.
              </p>
              <Link href="/docs/privacy-model" className="text-link mt-4">
                Read the privacy model
              </Link>
            </div>
            <div className="sheet px-6 py-5">
              <h3 className="t-section">What a transparent payment reveals</h3>
              <Facts items={exposed} />
            </div>
          </div>
        </section>

        <section className="band band-surface" aria-labelledby="zcash-h">
          <div className="page-wrap cols-2">
            <div>
              <h2 className="t-title" id="zcash-h">
                Why shielded Zcash
              </h2>
              <p className="t-lede mt-3">
                Zcash is the settlement and privacy primitive that makes
                commercial confidentiality possible. It is not a branding layer.
              </p>
              <Link href="/docs/zcash-strategy" className="text-link mt-4">
                Read the Zcash strategy
              </Link>
            </div>
            <Facts items={zcashReasons} />
          </div>
        </section>

        <section className="band" aria-labelledby="authority-h">
          <div className="page-wrap cols-2">
            <div>
              <h2 className="t-title" id="authority-h">
                Treasury control stays at the edge
              </h2>
              <p className="t-lede mt-3">
                Obliq’s backend is architected without spending authority.
                Business approval and cryptographic signing remain separate
                responsibilities.
              </p>
              <Link href="/security" className="text-link mt-4">
                Read the security model
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <AuthorityList
                title="Obliq holds"
                items={holds}
                glyph="glyph glyph-done text-clear"
              />
              <AuthorityList
                title="Obliq never holds"
                items={neverHolds}
                glyph="glyph glyph-stop text-stop"
              />
            </div>
          </div>
        </section>

        <section className="band band-surface" aria-labelledby="status-h">
          <div className="page-wrap cols-2">
            <div>
              <h2 className="t-title" id="status-h">
                What is proven, and where
              </h2>
              <p className="t-lede mt-3">
                A hatched label means it is not live. Regtest is an isolated
                test network, and a regtest result says nothing about the public
                Zcash network, so each network is listed on its own line.
              </p>
              <Link href="/proof" className="text-link mt-4">
                Open the capability register
              </Link>
            </div>
            <div className="grid gap-5">
              <div className="sheet overflow-hidden">
                <table className="ledger">
                  <caption>Settlement networks</caption>
                  <thead>
                    <tr>
                      <th scope="col">Network</th>
                      <th scope="col">Status</th>
                      <th scope="col">Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim) => (
                      <tr key={claim.id}>
                        <td className="lead">{claim.subject}</td>
                        <td>
                          <NetworkStamp
                            label={claim.label}
                            tone={claim.tone}
                            {...(claim.scope ? { scope: claim.scope } : {})}
                          />
                        </td>
                        <td className="text-ink-2">{claim.detail}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="sheet overflow-hidden">
                <table className="ledger">
                  <caption>Product</caption>
                  <thead>
                    <tr>
                      <th scope="col">Capability</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.map(([name, productStatus]) => (
                      <tr key={name}>
                        <td className="lead">{name}</td>
                        <td>
                          <StatusPill status={productStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="band" aria-labelledby="start-h">
          <div className="page-wrap cols-2">
            <div>
              <h2 className="t-title" id="start-h">
                Your first obligation, in four steps
              </h2>
              <p className="t-lede mt-3">
                The shortest route to a bill that is approved and ready to
                settle.{" "}
                {preview
                  ? "These steps happen in a workspace, which this read-only preview does not serve."
                  : "The workspace tracks these steps for you."}
              </p>
              {!preview && (
                <Link href={primary.href} className="button button-dark mt-6">
                  {primary.label}
                </Link>
              )}
            </div>
            <ol className="sheet steps">
              {firstSteps.map(([title, text, href]) => (
                <li key={title}>
                  <div>
                    <h3 className="font-semibold">
                      {preview ? (
                        title
                      ) : (
                        <Link
                          href={href}
                          className="text-violet inline-flex min-h-11 items-center underline"
                        >
                          {title}
                        </Link>
                      )}
                    </h3>
                    <p className="t-small mt-1">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Facts({ items }: { items: readonly (readonly [string, string])[] }) {
  return (
    <dl className="plain-list mt-4">
      {items.map(([term, text]) => (
        <div
          key={term}
          className="grid gap-x-6 gap-y-1 sm:grid-cols-[11rem_1fr]"
        >
          <dt className="font-semibold">{term}</dt>
          <dd className="text-ink-2">{text}</dd>
        </div>
      ))}
    </dl>
  );
}

function AuthorityList({
  title,
  items,
  glyph,
}: {
  title: string;
  items: readonly string[];
  glyph: string;
}) {
  return (
    <div className="sheet px-5 py-4">
      <h3 className="t-section">{title}</h3>
      <ul className="plain-list mt-4">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className={`${glyph} mt-[0.3rem]`} aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
