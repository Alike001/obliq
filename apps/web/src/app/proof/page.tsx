import { CheckCircle2, CircleSlash2, GitCommitHorizontal } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatusPill } from "@/components/status-pill";
import { checkDatabaseConnection, verifyAuditChain } from "@obliq/database";
import { getDatabase } from "@/lib/db";

const capabilities = [
  [
    "Application foundation",
    "IMPLEMENTED",
    "Routes, design system, workspace boundaries and build pipeline",
  ],
  [
    "PostgreSQL persistence",
    "IMPLEMENTED",
    "Migrated repositories for vendors, sources, obligations and audit events",
  ],
  [
    "Deterministic policy engine",
    "IMPLEMENTED",
    "Immutable policy versions produce structured findings and approval requirements",
  ],
  [
    "Approval workflow",
    "IMPLEMENTED",
    "Role eligibility, distinct actors, creator separation and stale-approval invalidation",
  ],
  [
    "Destination controls",
    "IMPLEMENTED",
    "Authorized manual verification with provenance; destination changes invalidate approvals",
  ],
  [
    "Settlement readiness",
    "IMPLEMENTED",
    "Explainable version-bound authorization gate; it does not move money",
  ],
  [
    "Development extraction provider",
    "SEEDED",
    "Labelled fixture suggestions only; human review is mandatory",
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
    "IMPLEMENTED",
    "Organization-local SHA-256 event chain with verification tests; not blockchain evidence",
  ],
  [
    "Evidence generation",
    "PLANNED",
    "Schema exists; no artifact or verification path exists",
  ],
] as const;

export const dynamic = "force-dynamic";
export default async function ProofPage() {
  const commit =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    process.env.GIT_COMMIT_SHA?.slice(0, 12) ??
    "local-development";
  let databaseRuntime = "NOT CONFIGURED";
  let auditRuntime = "NOT CONFIGURED";
  if (process.env.DATABASE_URL) {
    try {
      await checkDatabaseConnection(getDatabase());
      databaseRuntime = "CONNECTED";
      if (process.env.OBLIQ_DEV_ORGANIZATION_ID) {
        const audit = await verifyAuditChain(
          getDatabase(),
          process.env.OBLIQ_DEV_ORGANIZATION_ID,
        );
        auditRuntime = audit.valid
          ? `VALID · ${audit.eventCount} events`
          : "INVALID";
      }
    } catch {
      databaseRuntime = "UNAVAILABLE";
    }
  }
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
            Phase 2 reports persisted controls, human approvals and readiness.
            READY_TO_SETTLE is business authorization only. There is no
            fabricated transaction, signature, reconciliation result or
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
              label="Audit-chain runtime"
              value={auditRuntime}
              detail="Computed server-side by replaying the configured organization's application event chain. This is not blockchain evidence."
              good={auditRuntime.startsWith("VALID")}
            />
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
              value={databaseRuntime}
              detail={
                databaseRuntime === "CONNECTED"
                  ? "A server-side SELECT 1 succeeded in this runtime."
                  : "Persistence fails explicitly; there is no substitute store."
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
