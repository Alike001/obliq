import { ArrowRight, Database, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";

export const metadata = { title: "Public pilot" };
export const dynamic = "force-dynamic";

export default function PilotPage() {
  const enabled = getRuntimeSecurityConfig().deploymentMode === "pilot";
  return (
    <>
      <SiteHeader />
      <main className="page-wrap py-14 md:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="eyebrow">Persistent product trial</p>
          <h1 className="display mt-4 max-w-[18ch]">
            Run a fictional payable through the real Obliq backend.
          </h1>
          <p className="t-lede mt-6 max-w-2xl">
            Create vendors and obligations, reload persisted records, run
            deterministic controls, and inspect the audit history in your own
            isolated workspace.
          </p>
          <div className="notice notice-hold mt-8" role="note">
            <span className="glyph glyph-attn" aria-hidden />
            <div>
              <strong>Fictional data only. Payments are disabled.</strong>
              <p>
                Do not enter real invoices, addresses, personal information,
                wallet credentials, keys, or financial records. Guest access is
                not verified identity and cannot approve or move money.
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <Database size={20} aria-hidden />
              <h2 className="mt-3 font-semibold">Real persistence</h2>
              <p className="text-muted mt-2 text-sm leading-6">
                PostgreSQL repositories, tenant scoping, duplicate detection,
                policy findings, and chained activity records.
              </p>
            </div>
            <div className="card p-5">
              <ShieldCheck size={20} aria-hidden />
              <h2 className="mt-3 font-semibold">Deliberately bounded</h2>
              <p className="text-muted mt-2 text-sm leading-6">
                No uploads, recipient email, approvals, destinations, evidence
                issuance, observer, signer, broadcast, or settlement.
              </p>
            </div>
          </div>
          {enabled ? (
            <form action="/pilot/start" method="post" className="mt-8">
              <button className="button button-dark">
                Create isolated workspace <ArrowRight size={15} aria-hidden />
              </button>
              <p className="text-muted mt-3 text-xs">
                Expires after two hours. Creation and mutations are rate
                limited.
              </p>
            </form>
          ) : (
            <div className="notice mt-8" role="status">
              <div>
                <strong>The persistent pilot is not enabled here.</strong>
                <p>Use the browser-only demo instead; it stores no records.</p>
                <Link href="/demo" className="text-link mt-2 inline-block">
                  Open interactive demo
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
