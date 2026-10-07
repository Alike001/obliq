import Link from "next/link";
import {
  ArrowRight,
  Check,
  EyeOff,
  FileText,
  Landmark,
  SlidersHorizontal,
} from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { StatusPill } from "@/components/status-pill";

const workflow = [
  "Invoice",
  "Approve",
  "Pay privately with Zcash",
  "Reconcile",
];
const lifecycle = [
  [
    "01",
    "Capture",
    "Bring the business obligation into one controlled record.",
  ],
  [
    "02",
    "Control",
    "Apply deterministic policy and deliberate human approval.",
  ],
  ["03", "Settle", "Hand an exact intent to an authorized external signer."],
  ["04", "Reconcile", "Match network evidence back to the obligation."],
  [
    "05",
    "Prove",
    "Create controlled financial evidence for the right audience.",
  ],
] as const;

export default function LandingPage() {
  const preview = process.env.OBLIQ_DEPLOYMENT_MODE === "preview";
  return (
    <main>
      <SiteHeader />
      <section className="hairline overflow-hidden border-b">
        <div className="page-wrap grid min-h-[730px] items-center gap-12 py-20 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="mb-7 flex items-center gap-3">
              <StatusPill status="IMPLEMENTED" />
              <span className="text-muted text-xs">
                Phase 2 control &amp; approval engine
              </span>
            </div>
            <h1 className="display max-w-[780px]">
              Pay your business bills without publishing your business.
            </h1>
            <p className="text-muted mt-8 max-w-2xl text-lg leading-8">
              Obliq helps crypto teams manage bills, approvals and private Zcash
              settlements—without giving up control of their treasury.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href={preview ? "/proof" : "/app"}
                className="button button-dark"
              >
                {preview ? "Inspect the proof" : "Explore the product"}{" "}
                <ArrowRight size={16} />
              </Link>
              <Link href="/docs" className="button button-light">
                Read the architecture
              </Link>
            </div>
            <p className="text-muted mt-5 max-w-xl text-xs leading-5">
              {preview
                ? "This hosted preview is read-only. Financial operations, evidence verification and Zcash services are disabled; public-network settlement remains blocked."
                : "Capture, deterministic controls and human approvals are implemented. Zcash settlement and reconciliation remain explicitly unavailable—not simulated."}
            </p>
          </div>
          <ProductPreview />
        </div>
      </section>

      <section
        className="hairline bg-panel border-b py-8"
        aria-label="Core workflow"
      >
        <div className="page-wrap flex flex-col gap-4 md:flex-row md:items-center">
          <span className="eyebrow shrink-0">The operating loop</span>
          <ol className="flex flex-1 flex-wrap items-center gap-2 md:justify-end">
            {workflow.map((step, index) => (
              <li
                key={step}
                className="flex items-center gap-2 text-sm font-medium"
              >
                <span className="hairline rounded-full border bg-white px-4 py-2.5">
                  {step}
                </span>
                {index < workflow.length - 1 && (
                  <ArrowRight className="text-muted" size={14} aria-hidden />
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page-wrap py-28">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr]">
          <div>
            <p className="eyebrow">Private by business design</p>
            <h2 className="section-title mt-5">
              A finance system—not another wallet.
            </h2>
            <p className="text-muted mt-6 max-w-md leading-7">
              Public payment graphs can expose who a company pays, how much, and
              how often. Obliq keeps the business workflow primary and uses
              shielded Zcash settlement as the privacy layer.
            </p>
          </div>
          <div className="hairline bg-line grid gap-px overflow-hidden rounded-3xl border md:grid-cols-3">
            <ValueCard
              icon={<FileText />}
              title="Obligation first"
              text="A payment begins with a bill, vendor, purpose and accountable owner."
            />
            <ValueCard
              icon={<SlidersHorizontal />}
              title="Control before movement"
              text="Policy and approval are distinct from wallet authorization."
            />
            <ValueCard
              icon={<EyeOff />}
              title="Privacy with evidence"
              text="Keep public observers out while retaining controlled business records."
            />
          </div>
        </div>
      </section>

      <section className="bg-ink py-28 text-white">
        <div className="page-wrap">
          <div className="max-w-2xl">
            <p className="eyebrow !text-mint">The Obliq lifecycle</p>
            <h2 className="section-title mt-5">
              From obligation to accountable settlement.
            </h2>
          </div>
          <ol className="mt-16 grid border-y border-white/15 lg:grid-cols-5">
            {lifecycle.map(([number, title, text]) => (
              <li
                key={title}
                className="border-b border-white/15 p-6 last:border-0 lg:border-r lg:border-b-0"
              >
                <span className="text-mint font-mono text-xs">{number}</span>
                <h3 className="mt-12 text-xl font-medium">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/55">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page-wrap py-28">
        <div className="card grid gap-10 p-7 md:p-12 lg:grid-cols-2">
          <div>
            <Landmark className="text-forest" size={28} />
            <h2 className="mt-8 text-3xl font-medium tracking-[-.045em]">
              Treasury control stays at the edge.
            </h2>
            <p className="text-muted mt-4 max-w-lg leading-7">
              Obliq’s backend is architected without unrestricted spending
              authority. Business approval and cryptographic signing remain
              separate responsibilities.
            </p>
          </div>
          <ul className="grid content-center gap-4 text-sm">
            {[
              "No seed phrase or private spending key on the server",
              "AI cannot approve, sign or broadcast",
              "Viewing capability is treated as sensitive secret material",
              "Unsupported capabilities are labelled honestly",
            ].map((item) => (
              <li key={item} className="hairline flex gap-3 border-b pb-4">
                <Check className="text-forest mt-0.5 shrink-0" size={17} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}

function ValueCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="bg-panel p-7">
      {icon}
      <h3 className="mt-16 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-muted mt-3 text-sm leading-6">{text}</p>
    </article>
  );
}

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]">
      <div className="bg-mint/35 absolute -inset-20 -z-10 rounded-full blur-3xl" />
      <div className="border-ink/15 overflow-hidden rounded-2xl border bg-[#e9ebe6] shadow-[0_35px_90px_-45px_rgba(20,33,29,.5)]">
        <div className="border-ink/10 bg-panel flex items-center justify-between border-b px-5 py-3">
          <span className="text-xs font-semibold">Operations overview</span>
          <StatusPill status="SEEDED" />
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-3">
          {["Due this week", "Awaiting approval", "Needs attention"].map(
            (label, index) => (
              <div key={label} className="bg-panel rounded-xl p-4">
                <p className="text-muted text-[11px]">{label}</p>
                <p className="mt-3 text-2xl font-medium">
                  {["$24.8k", "4", "2"][index]}
                </p>
              </div>
            ),
          )}
        </div>
        <div className="bg-panel m-4 mt-0 rounded-xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold">Example obligations</p>
            <span className="text-muted text-[10px]">LAYOUT DATA ONLY</span>
          </div>
          {[
            ["Northstar Labs", "Infrastructure", "$8,400"],
            ["Common Thread", "Contractor", "$3,250"],
            ["Nodal Systems", "Security review", "$12,000"],
          ].map((row) => (
            <div
              key={row[0]}
              className="hairline grid grid-cols-[1.2fr_1fr_auto] gap-3 border-t py-3 text-xs"
            >
              <span className="font-medium">{row[0]}</span>
              <span className="text-muted">{row[1]}</span>
              <span className="font-mono">{row[2]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
