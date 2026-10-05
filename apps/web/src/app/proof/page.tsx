import { CheckCircle2, CircleSlash2, GitCommitHorizontal } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatusPill } from "@/components/status-pill";

const capabilities = [
  [
    "Application foundation",
    "IMPLEMENTED",
    "Routes, design system, workspace boundaries and build pipeline",
  ],
  [
    "Database schema",
    "IMPLEMENTED",
    "PostgreSQL schema and initial migration; runtime connection is deployment-dependent",
  ],
  [
    "Example application data",
    "SEEDED",
    "Visual fixtures only; never used as settlement proof",
  ],
  [
    "Zcash settlement",
    "UNAVAILABLE",
    "No transaction construction, signing or broadcast adapter",
  ],
  [
    "Reconciliation",
    "UNAVAILABLE",
    "No viewing key, scanner or network observer configured",
  ],
  [
    "Audit chain",
    "PLANNED",
    "Schema exists; event generation and integrity verification do not",
  ],
  [
    "Evidence generation",
    "PLANNED",
    "Schema exists; no artifact or verification path exists",
  ],
] as const;

export default function ProofPage() {
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    process.env.GIT_COMMIT_SHA?.slice(0, 12) ??
    "local-development";
  const databaseConfigured = Boolean(process.env.DATABASE_URL);
  return (
    <main>
      <SiteHeader />
      <section className="hairline bg-ink border-b text-white">
        <div className="page-wrap py-20 md:py-24">
          <p className="eyebrow !text-mint">Technical proof surface</p>
          <h1 className="section-title mt-5 max-w-3xl">
            Claims should be inspectable—or marked unavailable.
          </h1>
          <p className="mt-6 max-w-2xl leading-7 text-white/60">
            Phase 0 reports product and build capability only. There is no
            fabricated transaction, network connection, reconciliation result or
            blockchain evidence.
          </p>
        </div>
      </section>
      <section className="page-wrap py-16">
        <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <div className="card bg-panel overflow-hidden">
            <div className="hairline border-b p-5">
              <h2 className="font-semibold">Capability register</h2>
              <p className="text-muted mt-1 text-xs">
                Runtime truth for this phase
              </p>
            </div>
            <div className="divide-ink/8 divide-y">
              {capabilities.map(([name, status, detail]) => (
                <div
                  key={name}
                  className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-medium">{name}</p>
                    <p className="text-muted mt-1 text-xs leading-5">
                      {detail}
                    </p>
                  </div>
                  <StatusPill status={status} />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <ProofCard
              label="Server spend authority"
              value="NONE"
              detail="No spending-key field, secret or signer adapter exists."
              good
            />
            <ProofCard
              label="AI spend authority"
              value="NONE"
              detail="AI boundary exposes suggestions requiring human review."
              good
            />
            <ProofCard
              label="Database runtime"
              value={databaseConfigured ? "CONFIGURED" : "NOT CONFIGURED"}
              detail={
                databaseConfigured
                  ? "DATABASE_URL is present; connectivity is not asserted on this page."
                  : "No DATABASE_URL is present in this runtime."
              }
            />
            <div className="card bg-panel p-5">
              <div className="text-muted flex items-center gap-2">
                <GitCommitHorizontal size={16} />
                <span className="text-xs">Build commit</span>
              </div>
              <p className="mt-3 font-mono text-sm break-all">{commit}</p>
            </div>
          </div>
        </div>
      </section>
      <section className="hairline bg-panel border-y">
        <div className="page-wrap grid gap-8 py-14 md:grid-cols-3">
          <Boundary
            title="Payment request"
            text="ZIP-321 is selected as the future canonical standard; no request is generated today."
          />
          <Boundary
            title="Signing"
            text="An external-signer port exists. No wallet, key material, signature or broadcast implementation exists."
          />
          <Boundary
            title="Viewing"
            text="The read-only observer port can express UNAVAILABLE. No Orchard scanning capability is assumed."
          />
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function ProofCard({
  label,
  value,
  detail,
  good = false,
}: {
  label: string;
  value: string;
  detail: string;
  good?: boolean;
}) {
  return (
    <article className="card bg-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted text-xs">{label}</p>
        {good ? (
          <CheckCircle2 size={17} className="text-emerald-700" />
        ) : (
          <CircleSlash2 size={17} className="text-stone-500" />
        )}
      </div>
      <p className="mt-4 font-mono text-xl font-semibold">{value}</p>
      <p className="text-muted mt-3 text-xs leading-5">{detail}</p>
    </article>
  );
}
function Boundary({ title, text }: { title: string; text: string }) {
  return (
    <article>
      <p className="eyebrow">Boundary</p>
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="text-muted mt-3 text-sm leading-6">{text}</p>
    </article>
  );
}
