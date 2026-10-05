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
    "A later reconciliation service may hold minimum read-only capability. It remains sensitive secret material.",
    "PLANNED",
  ],
  [
    "Deterministic controls",
    "Policy evaluation, approval invalidation and readiness gates are designed but not active in Phase 0.",
    "PLANNED",
  ],
  [
    "AI authority",
    "AI-facing types require human review and provide no approval, signing or broadcast capability.",
    "IMPLEMENTED",
  ],
] as const;

export default function SecurityPage() {
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
              cryptographic spending authority. Phase 0 establishes and
              documents those boundaries before money-moving functionality
              exists.
            </p>
          </div>
        </div>
      </section>
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
            title="Human accountability"
            text="AI may suggest, extract or flag. It cannot approve, alter policy, sign or broadcast."
          />
          <SecurityCard
            icon={<Database />}
            title="Tenant boundary"
            text="Tenant-owned tables carry organization_id. Server-side authorization is required; production identity remains planned."
          />
          <SecurityCard
            icon={<Eye />}
            title="Failure honesty"
            text="A scanner or RPC outage creates an unavailable state. It is never translated into paid or unpaid."
          />
        </div>
        <div className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <p className="text-sm font-semibold">Controls not yet active</p>
          <p className="text-muted mt-2 text-sm leading-6">
            Destination-change reverification, approval invalidation, quote
            expiry, audit chaining and settlement readiness are architectural
            requirements for later phases, not Phase 0 runtime guarantees.
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
          label="Future observer"
          detail="Minimum read-only capability"
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
