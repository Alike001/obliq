import {
  ArrowDown,
  Bot,
  Database,
  Eye,
  KeyRound,
  Server,
  UserCheck,
} from "lucide-react";
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

export default function SecurityPage() {
  const preview = process.env.OBLIQ_DEPLOYMENT_MODE === "preview";
  return (
    <main>
      <SiteHeader />
      <section className="hairline border-b">
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
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
            <p className="text-sm font-semibold">Public preview boundary</p>
            <p className="text-muted mt-2 text-sm leading-6">
              This host has no database, authentication provider, document
              storage, observer or signer. Product, authentication, external
              evidence-verification and every mutation route are unavailable.
            </p>
          </div>
        </section>
      )}
      <section className="page-wrap py-20">
        <div className="grid gap-12 lg:grid-cols-[.75fr_1.25fr]">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Key separation
            </h2>
            <p className="text-muted mt-4 leading-7">
              Approval records express business intent. They never substitute
              for a wallet signature.
            </p>
          </div>
          <AuthorityDiagram />
        </div>
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
        <div className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p className="text-sm font-semibold">Current limits</p>
          <p className="text-muted mt-2 text-sm leading-6">
            Uploaded files are validated by signature, size and MIME agreement,
            stored under generated private identifiers, and never exposed by a
            public raw-file route. Production mode requires private quarantine
            storage and a real scanner CLEAN result; local unscanned storage is
            development-only. Destination verification is a recorded manual
            process, not cryptographic proof of receiver ownership. A
            destination replacement or material obligation edit invalidates
            authorization. OIDC/session and shared rate-limit architectures are
            implemented, but provider credentials and production infrastructure
            are not bundled. Hardware-backed signer operations, live quote
            integrity, observer HA and independent audit anchoring remain
            planned. The proven observer can reveal account activity if its
            UFVK, memo plaintext, logs or correlation metadata are compromised.
            Regtest proof does not qualify mainnet operations. External signing
            and broadcast are verified on regtest only; public-network execution
            is BLOCKED. The earlier Zaino subtree-root defect is fixed upstream,
            but Obliq public sync, reorg recovery and a funded shielded flow
            remain unproved. A compromised signer can spend its wallet, while
            compromise of both app and signer could substitute a transaction
            unless the human independently checks the Zallet PCZT inspection.
            Evidence links use 256-bit random identifiers but remain
            bearer-like: anyone with a link can read its deliberately disclosed
            fields. Responses use no-store/no-referrer/noindex and shared rate
            limits, yet copied links or downloaded JSON can still leak. Secure
            delivery and recipient-bound expiry remain planned. Revoked and
            superseded evidence remains historical and visibly non-current.
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function AuthorityDiagram() {
  return (
    <div className="card bg-panel p-5 md:p-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <Node
          icon={<UserCheck />}
          label="Finance team"
          detail="Business approval"
        />
        <Node icon={<Server />} label="Obliq" detail="Intent, no spend key" />
        <Node
          icon={<KeyRound />}
          label="External signer"
          detail="Cryptographic authority"
        />
      </div>
      <div className="text-muted my-5 flex items-center justify-center gap-3 text-xs">
        <span>checks</span>
        <ArrowDown className="rotate-[-90deg]" size={15} />
        <span>exact intent</span>
        <ArrowDown className="rotate-[-90deg]" size={15} />
        <span>user authorization</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Node
          icon={<Eye />}
          label="Read-only observer"
          detail="UFVK; privacy access, no spend"
        />
        <Node icon={<Bot />} label="AI boundary" detail="Suggestions only" />
      </div>
    </div>
  );
}
function Node({
  icon,
  label,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <div className="hairline rounded-xl border bg-white p-4">
      <div className="text-forest">{icon}</div>
      <p className="mt-4 text-sm font-semibold">{label}</p>
      <p className="text-muted mt-1 text-[11px]">{detail}</p>
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
      <div className="text-forest">{icon}</div>
      <h3 className="mt-8 font-semibold">{title}</h3>
      <p className="text-muted mt-3 text-sm leading-6">{text}</p>
    </article>
  );
}
