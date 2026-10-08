import {
  Bot,
  Database,
  Eye,
  KeyRound,
  MoveRight,
  Server,
  UserCheck,
} from "lucide-react";
import { Notice } from "@/components/notice";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatusPill } from "@/components/status-pill";

const principles = [
  [
    "Spending authority",
    "An authorized user-controlled wallet or signer must hold it. The Obliq backend has none by architecture.",
    "IMPLEMENTED",
  ],
  [
    "Viewing authority",
    "A dedicated server-only observer may hold a UFVK imported as ViewOnly. It remains high-value privacy secret material.",
    "IMPLEMENTED",
  ],
  [
    "Deterministic controls",
    "Versioned policies, structured findings, approval invalidation and explainable readiness gates run server-side.",
    "IMPLEMENTED",
  ],
  [
    "AI authority",
    "AI-facing types require human review and provide no approval, signing or broadcast capability.",
    "IMPLEMENTED",
  ],
] as const;

// Three authorities, held by three different parties. Each says who holds it,
// what it allows and what it can never do.
const authorities = [
  {
    icon: UserCheck,
    name: "Business approval",
    holder: "Your finance team, recorded in Obliq",
    can: [
      "Approve or reject an obligation under a versioned policy",
      "Pass the readiness gate, after which an exact intent can be prepared",
    ],
    cannot: [
      "Sign or broadcast a transaction",
      "Stand in for a wallet signature",
    ],
  },
  {
    icon: Eye,
    name: "Viewing authority",
    holder: "A dedicated, server-only read-only observer",
    can: [
      "See shielded payments to the account, through a UFVK imported as ViewOnly",
      "Match a payment back to its obligation",
    ],
    cannot: [
      "Spend or move funds",
      "Be treated as harmless: it is high-value privacy secret material",
    ],
  },
  {
    icon: KeyRound,
    name: "Spending authority",
    holder: "A wallet or signer you control, outside Obliq",
    can: [
      "Inspect, sign and broadcast the transaction in a human-operated ceremony",
      "Spend the wallet it controls, which is why it stays with you",
    ],
    cannot: [
      "Be held by the Obliq backend, which has none by architecture",
      "Return anything to Obliq but sanitized receipts: no PCZT, raw transaction, credential or key",
    ],
  },
] as const;

// The current limits, one statement each, in the order they were written.
const limits = [
  "Uploaded files are validated by signature, size and MIME agreement, stored under generated private identifiers, and never exposed by a public raw-file route.",
  "Production mode requires private quarantine storage and a real scanner CLEAN result; local unscanned storage is development-only.",
  "Destination verification is a recorded manual process, not cryptographic proof of receiver ownership.",
  "A destination replacement or material obligation edit invalidates authorization.",
  "OIDC/session and shared rate-limit architectures are implemented, but provider credentials and production infrastructure are not bundled.",
  "Hardware-backed signer operations, live quote integrity, observer HA and independent audit anchoring remain planned.",
  "The proven observer can reveal account activity if its UFVK, memo plaintext, logs or correlation metadata are compromised.",
  "Regtest proof does not qualify mainnet operations. External signing and broadcast are verified on regtest only; public-network execution is BLOCKED.",
  "The earlier Zaino subtree-root defect is fixed upstream, but Obliq public sync, reorg recovery and a funded shielded flow remain unproved.",
  "A compromised signer can spend its wallet, while compromise of both app and signer could substitute a transaction unless the human independently checks the Zallet PCZT inspection.",
  "Evidence links use 256-bit random identifiers but remain bearer-like: anyone with a link can read its deliberately disclosed fields.",
  "Responses use no-store/no-referrer/noindex and shared rate limits, yet copied links or downloaded JSON can still leak.",
  "Secure delivery and recipient-bound expiry remain planned.",
  "Revoked and superseded evidence remains historical and visibly non-current.",
] as const;

export default function SecurityPage() {
  const preview = process.env.OBLIQ_DEPLOYMENT_MODE === "preview";
  return (
    <main>
      <a href="#main" className="button button-dark skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <section id="main" tabIndex={-1} className="hairline border-b">
        <div className="page-wrap py-20 md:py-28">
          <div className="max-w-3xl">
            <p className="eyebrow">Security architecture</p>
            <h1 className="section-title mt-5">
              Obliq cannot spend your treasury funds.
            </h1>
            <p className="text-muted mt-7 text-lg leading-8">
              The system separates business decisions, viewing capability and
              cryptographic spending authority. Phase 2 enforces business
              authorization while Phase 3 isolates read-only reconciliation and
              Phase 4 keeps spending authority external, Phase 5 adds controlled
              disclosure, and Phase 6 hardens identity, storage, abuse and
              deployment boundaries without changing either Zcash authority
              boundary.
            </p>
          </div>
        </div>
      </section>
      {preview && (
        <section className="page-wrap pt-10">
          <Notice tone="hatched" title="Public preview boundary">
            This host has no database, authentication provider, document
            storage, observer or signer. Product, authentication, external
            evidence-verification and every mutation route are unavailable.
          </Notice>
        </section>
      )}
      <section className="page-wrap py-20">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            Key separation
          </h2>
          <p className="text-muted mt-4 leading-7">
            Approval records express business intent. They never substitute for
            a wallet signature. Three separate authorities are involved, and no
            single party holds all of them.
          </p>
        </div>
        <AuthorityDiagram />
      </section>
      <section className="hairline bg-panel border-y">
        <div className="page-wrap grid md:grid-cols-2">
          {principles.map(([title, text, status]) => (
            <article
              key={title}
              className="hairline border-b p-7 md:border-r md:p-10"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold">{title}</h3>
                <StatusPill status={status} />
              </div>
              <p className="text-muted mt-4 text-sm leading-6">{text}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="page-wrap py-20">
        <div className="grid gap-5 md:grid-cols-3">
          <SecurityCard
            icon={<UserCheck />}
            title="Separation of duties"
            text="Requirements check role eligibility server-side. Material tiers can prohibit the requester and require distinct approvers."
          />
          <SecurityCard
            icon={<KeyRound />}
            title="External signer isolation"
            text="The privileged Zallet RPC stays local to its operator. Obliq receives only an intent-bound transaction reference and hashes—not PCZTs, raw transactions, credentials or keys."
          />
          <SecurityCard
            icon={<Database />}
            title="Tenant boundary"
            text="OIDC resolves a pre-provisioned identity and active membership. Financial records carry organization_id; cross-tenant reads and actions are denied server-side. RLS is not claimed."
          />
          <SecurityCard
            icon={<Eye />}
            title="Failure honesty"
            text="Node, scanner or viewing-authority failure creates an unavailable state. It never becomes paid or unpaid."
          />
          <SecurityCard
            icon={<Database />}
            title="Controlled evidence"
            text="A closed server-side allowlist and role checks constrain disclosure. Random links are rate-limited, non-indexed and no-store; issued content is immutable and verified before display or download."
          />
          <SecurityCard
            icon={<Server />}
            title="Quarantined uploads"
            text="Production stores generated private objects and requires an authenticated scanner CLEAN result. Unknown or unavailable scanning fails ingestion closed."
          />
        </div>
        <section className="notice notice-hold mt-8" aria-labelledby="limits-h">
          <span className="glyph glyph-attn" aria-hidden />
          <div>
            <h2 id="limits-h" className="font-semibold">
              Current limits
            </h2>
            <ul className="mt-3 max-w-[78ch] space-y-2 text-sm leading-6">
              {limits.map((limit) => (
                <li key={limit} className="flex gap-3">
                  <span
                    className="bg-hold mt-[0.6rem] size-1.5 shrink-0 rounded-full"
                    aria-hidden
                  />
                  {limit}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </section>
      <SiteFooter />
    </main>
  );
}

function AuthorityDiagram() {
  return (
    <div className="mt-10">
      <ol className="grid gap-4 lg:grid-cols-3">
        {authorities.map(({ icon: Icon, name, holder, can, cannot }, index) => (
          <li key={name} className="card bg-panel relative p-5 md:p-6">
            <div className="flex items-center gap-3">
              <span className="text-carbon" aria-hidden>
                <Icon />
              </span>
              <span className="text-ink-3 text-xs font-bold">
                Authority {index + 1} of {authorities.length}
              </span>
            </div>
            <h3 className="mt-4 text-lg font-semibold">{name}</h3>
            <p className="text-muted mt-1 text-sm">Held by: {holder}</p>
            <AuthorityList label="Can" glyph="glyph glyph-done" items={can} />
            <AuthorityList
              label="Cannot"
              glyph="glyph glyph-stop text-stop"
              items={cannot}
            />
          </li>
        ))}
      </ol>
      <p className="text-muted mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-ink font-semibold">How they connect:</span>
        <span>policy checks and approval</span>
        <MoveRight size={15} aria-hidden />
        <span className="sr-only">then</span>
        <span>exact intent</span>
        <MoveRight size={15} aria-hidden />
        <span className="sr-only">then</span>
        <span>your authorization on the external signer</span>
        <MoveRight size={15} aria-hidden />
        <span className="sr-only">then</span>
        <span>read-only observation</span>
      </p>
      <p className="text-muted mt-3 flex items-start gap-2 text-sm">
        <Bot size={17} className="text-carbon mt-0.5 shrink-0" aria-hidden />
        <span>
          <span className="text-ink font-semibold">AI holds none of them.</span>{" "}
          It offers suggestions only, and each one requires human review.
        </span>
      </p>
    </div>
  );
}
function AuthorityList({
  label,
  glyph,
  items,
}: {
  label: string;
  glyph: string;
  items: readonly string[];
}) {
  return (
    <div className="hairline mt-5 border-t pt-4">
      <p className="fact-label">{label}</p>
      <ul className="mt-2 space-y-2 text-sm leading-6">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span className={`${glyph} mt-[0.4rem]`} aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
function SecurityCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="card bg-panel p-6">
      <div className="text-carbon" aria-hidden>
        {icon}
      </div>
      <h3 className="mt-8 font-semibold">{title}</h3>
      <p className="text-muted mt-3 text-sm leading-6">{text}</p>
    </article>
  );
}
