import { CheckCircle2, CircleSlash2, GitCommitHorizontal } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatusPill } from "@/components/status-pill";
import { checkDatabaseConnection, verifyAuditChain } from "@obliq/database";
import { getDatabase } from "@/lib/db";
import { phase3NetworkProof } from "@/content/phase3-proof";
import { phase4NetworkProof } from "@/content/phase4-proof";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";

const capabilities = [
  [
    "Production identity boundary",
    "IMPLEMENTED",
    "OIDC authorization-code flow with PKCE, nonce/state validation, provisioned identities and revocable server-side sessions",
  ],
  [
    "Distributed rate limiting",
    "IMPLEMENTED",
    "PostgreSQL-backed atomic buckets protect authentication, mutations, uploads and public evidence access",
  ],
  [
    "Private production storage boundary",
    "IMPLEMENTED",
    "S3-compatible private quarantine storage requires a clean external scanner result before ingestion",
  ],
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
    "Shielded observation",
    "IMPLEMENTED",
    "UFVK-only librustzcash observer proved against a real mined Z3 regtest output",
  ],
  [
    "Read-side reconciliation",
    "IMPLEMENTED",
    "Receiver + opaque memo + exact amount correlation with idempotent confirmation tracking",
  ],
  [
    "Public-network settlement",
    "BLOCKED",
    "Upstream Zaino now includes Ironwood subtree-root support, but Obliq public sync and a funded public shielded flow remain unproved",
  ],
  [
    "Settlement intent",
    "IMPLEMENTED",
    "Expiring quote plus immutable obligation/policy/destination/ZIP-321 binding",
  ],
  [
    "External shielded signing",
    "IMPLEMENTED",
    "Human-operated Zallet PCZT ceremony; application receives sanitized receipts only",
  ],
  [
    "Shielded broadcast",
    "IMPLEMENTED",
    "Verified on isolated regtest; broadcast remains distinct from settlement",
  ],
  [
    "Audit chain",
    "IMPLEMENTED",
    "Organization-local SHA-256 event chain with verification tests; not blockchain evidence",
  ],
  [
    "Evidence engine",
    "IMPLEMENTED",
    "Settled canonical records produce immutable application evidence",
  ],
  [
    "Canonical hashing",
    "IMPLEMENTED",
    "Schema-versioned canonical JSON with SHA-256 tamper detection",
  ],
  [
    "Controlled disclosure",
    "IMPLEMENTED",
    "Closed field allowlist, classifications and server-side role checks",
  ],
  [
    "External evidence verification",
    "IMPLEMENTED",
    "256-bit public identifiers expose only deliberately issued claims",
  ],
  [
    "Evidence JSON",
    "IMPLEMENTED",
    "Canonical JSON download derives from the exact verified artifact",
  ],
  [
    "Native evidence PDF",
    "PLANNED",
    "Printable HTML exists; native PDF generation is not implemented",
  ],
  [
    "ZK business proof",
    "UNAVAILABLE",
    "Application evidence is not represented as a zero-knowledge proof",
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
  let runtimeSummary = {
    auth: "UNAVAILABLE",
    storage: "UNAVAILABLE",
    rateLimit: "UNAVAILABLE",
    network: "UNAVAILABLE",
    publicNetwork: "PUBLIC_NETWORK_BLOCKED",
  };
  try {
    const runtime = getRuntimeSecurityConfig();
    runtimeSummary = {
      auth: runtime.authMode.toUpperCase(),
      storage: runtime.storageMode.toUpperCase(),
      rateLimit: runtime.rateLimitMode.toUpperCase(),
      network: runtime.network.toUpperCase(),
      publicNetwork: runtime.publicNetworkStatus,
    };
  } catch {
    // Runtime configuration failures are reported as unavailable without secrets.
  }
  if (process.env.DATABASE_URL) {
    try {
      await checkDatabaseConnection(getDatabase());
      databaseRuntime = "CONNECTED";
      const proofOrganization =
        process.env.OBLIQ_PROOF_ORGANIZATION_ID ??
        process.env.OBLIQ_DEV_ORGANIZATION_ID;
      if (proofOrganization) {
        const audit = await verifyAuditChain(getDatabase(), proofOrganization);
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
            Phase 6 reports hardened runtime boundaries alongside the real
            Phase-4 regtest settlement and UFVK-only reconciliation evidence.
            Public-network operation remains blocked until Obliq itself proves
            current public synchronization and a funded shielded flow.
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
              label="Runtime security modes"
              value={`${runtimeSummary.auth} · ${runtimeSummary.storage}`}
              detail={`Rate limits: ${runtimeSummary.rateLimit}. Zcash network: ${runtimeSummary.network}. ${runtimeSummary.publicNetwork}.`}
              good={runtimeSummary.auth !== "UNAVAILABLE"}
            />
            <ProofCard
              label="End-to-end settlement"
              value="VERIFIED · REGTEST"
              detail={`Intent ${phase4NetworkProof.intentHash.slice(0, 12)}…; tx ${phase4NetworkProof.txid.slice(0, 12)}…; height ${phase4NetworkProof.minedHeight}; ${phase4NetworkProof.confirmationEvidence.join(" → ")} confirmations; final state ${phase4NetworkProof.finalState}.`}
              good
            />
            <ProofCard
              label="External signer"
              value="VERIFIED · FULL PRIVACY"
              detail="Zallet created, inspected, proved, signed and extracted an Ironwood PCZT outside Obliq. No RPC credential, PCZT, raw transaction or key entered the app."
              good
            />
            <ProofCard
              label="Shielded tracer"
              value="VERIFIED · REGTEST"
              detail={`Ironwood output at height ${phase3NetworkProof.minedHeight}; ${phase3NetworkProof.confirmationEvidence.join(" → ")} confirmations; tx ${phase3NetworkProof.txid.slice(0, 12)}…`}
              good
            />
            <ProofCard
              label="Observer authority"
              value="UFVK · READ ONLY"
              detail="Imported as AccountPurpose::ViewOnly. The observer API has health and observation methods only. Viewing authority remains privacy-sensitive."
              good
            />
            <ProofCard
              label="Audit-chain runtime"
              value={auditRuntime}
              detail="Computed server-side by replaying the configured organization's application event chain. This is not blockchain evidence."
              good={auditRuntime.startsWith("VALID")}
            />
            <ProofCard
              label="Server spend authority"
              value="NONE"
              detail="No spending-key field, seed, wallet credential, PCZT or raw transaction is accepted by the application."
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
            text="Canonical one-payment ZIP-321 requests bind exact zatoshis and an opaque memo reference. The current quote source is controlled regtest, not market pricing."
          />
          <Boundary
            title="Signing"
            text="A human-operated Zallet PCZT ceremony performs cryptographic authorization. Only sanitized signing and broadcast receipts return to Obliq."
          />
          <Boundary
            title="Viewing"
            text="A dedicated librustzcash observer imports a UFVK as view-only, decrypts shielded outputs, and reports sync uncertainty without financial inference."
          />
          <Boundary
            title="Disclosure"
            text="Evidence contains only selected allowlisted claims with explicit provenance. Its SHA-256 hash protects artifact integrity; it does not attest every business assertion."
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
