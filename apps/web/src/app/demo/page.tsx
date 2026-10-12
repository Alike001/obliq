import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ExternalLink } from "lucide-react";
import { JudgeDemo } from "@/components/judge-demo";
import { RegtestSettlement } from "@/components/regtest-settlement";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Interactive sandbox",
  description:
    "Try Obliq's deterministic payable controls in a browser-only fictional sandbox.",
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return (
    <>
      <a href="#demo-main" className="button button-dark skip-link">
        Skip to demo
      </a>
      <SiteHeader />
      <main id="demo-main" tabIndex={-1}>
        <section className="on-ink bg-carbon text-white">
          <div className="page-wrap py-16 md:py-20">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,.75fr)] lg:items-end">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <p className="eyebrow">Interactive judge sandbox</p>
                  <span className="cap cap-hatched">
                    Fictional · not persisted
                  </span>
                </div>
                <h1 className="section-title mt-5 max-w-3xl">
                  Change a payable. See the real policy logic respond.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-white/70">
                  This public exercise runs deterministic Obliq domain logic in
                  your browser. It uses fictional data and cannot authenticate,
                  approve, sign, broadcast, observe, settle, or save anything.
                </p>
              </div>
              <div className="notice notice-hatched text-ink" role="note">
                <span className="glyph glyph-unknown" aria-hidden />
                <div>
                  <strong>Two evidence scopes</strong>
                  <p>
                    The controls below are interactive simulation. The regtest
                    record farther down is historical evidence and never changes
                    with this sandbox.
                  </p>
                </div>
              </div>
            </div>
            <a href="#sandbox" className="button button-primary mt-8">
              Try the controls <ArrowDown size={15} aria-hidden />
            </a>
          </div>
        </section>

        <section id="sandbox" className="page-wrap scroll-mt-24 py-14 md:py-20">
          <JudgeDemo />
        </section>

        <section
          className="band-carbon mt-4 py-14 md:py-16"
          aria-labelledby="evidence-divider-heading"
        >
          <div className="page-wrap">
            <p className="eyebrow">Recorded evidence · separate from sandbox</p>
            <h2
              id="evidence-divider-heading"
              className="t-title mt-4 max-w-3xl"
            >
              A real historical regtest run, not the scenario above.
            </h2>
            <p className="t-lede mt-5">
              The following facts are sourced from Obliq&rsquo;s committed
              tracer record. They prove the isolated regtest architecture only.
              They are not live, public-testnet, mainnet, or affected by
              anything you click on this page.
            </p>
            <Link href="/proof" className="text-link mt-4">
              Open the complete proof surface
              <ExternalLink size={14} aria-hidden />
            </Link>
          </div>
        </section>
        <RegtestSettlement />
        <div className="page-wrap py-14">
          <div className="notice notice-hatched" role="note">
            <span className="glyph glyph-unknown" aria-hidden />
            <div>
              <strong>Public-network boundary remains unchanged</strong>
              <p>
                Public-testnet read-only synchronization was demonstrated, but
                funded public-testnet settlement and mainnet remain unverified.
                This demo does not change that status.
              </p>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
