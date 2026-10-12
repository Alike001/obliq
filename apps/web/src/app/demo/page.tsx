import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, MessageSquareText } from "lucide-react";
import { JudgeDemo } from "@/components/judge-demo";
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
                  Decide whether this vendor invoice is ready for treasury.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-7 text-white/70">
                  You are the finance lead at fictional Aster Works. Review a
                  private vendor payable, resolve deterministic controls, and
                  see exactly where human authorization is still required.
                </p>
                <ol
                  className="mt-6 grid max-w-2xl gap-3 text-sm sm:grid-cols-3"
                  aria-label="Sandbox steps"
                >
                  <li className="border-t border-white/15 pt-3">
                    <strong>1. Pick a case</strong>
                    <span className="mt-1 block text-white/60">
                      New vendor, duplicate, or clear controls.
                    </span>
                  </li>
                  <li className="border-t border-white/15 pt-3">
                    <strong>2. Review findings</strong>
                    <span className="mt-1 block text-white/60">
                      See why policy passes or blocks it.
                    </span>
                  </li>
                  <li className="border-t border-white/15 pt-3">
                    <strong>3. Read the boundary</strong>
                    <span className="mt-1 block text-white/60">
                      Readiness is not approval or payment.
                    </span>
                  </li>
                </ol>
              </div>
              <div className="notice notice-hatched text-ink" role="note">
                <span className="glyph glyph-unknown" aria-hidden />
                <div>
                  <strong>Actual logic, safe boundary</strong>
                  <p>
                    The policy engine is real. The invoice and actions are a
                    browser-only exercise. Nothing is saved or sent.
                  </p>
                </div>
              </div>
            </div>
            <a href="#sandbox" className="button button-primary mt-8">
              Start the payable review <ArrowDown size={15} aria-hidden />
            </a>
          </div>
        </section>

        <section id="sandbox" className="page-wrap scroll-mt-24 py-14 md:py-20">
          <JudgeDemo />
        </section>

        <section
          className="band band-fog"
          aria-labelledby="demo-feedback-heading"
        >
          <div className="page-wrap grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <p className="eyebrow">After the exercise</p>
              <h2 id="demo-feedback-heading" className="t-title mt-3 text-3xl!">
                What would make this usable for your payables?
              </h2>
              <p className="text-muted mt-3 max-w-2xl text-sm leading-6">
                Share your role, what was clear, what was confusing, and the
                capability you would need next. Use fictional information only.
              </p>
            </div>
            <Link href="/feedback" className="button button-dark">
              <MessageSquareText size={15} aria-hidden /> Give product feedback
            </Link>
          </div>
        </section>

        <section
          className="band-carbon py-14 md:py-16"
          aria-labelledby="recorded-evidence-heading"
        >
          <div className="page-wrap grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="eyebrow">Recorded evidence · separate system</p>
              <h2
                id="recorded-evidence-heading"
                className="t-title mt-4 max-w-3xl"
              >
                Inspect the historical regtest settlement on its own terms.
              </h2>
              <p className="t-lede mt-5">
                The proof surface contains committed evidence from a real
                isolated-regtest run. It is not generated by this exercise and
                does not claim funded public-testnet or mainnet settlement.
              </p>
            </div>
            <div>
              <Link href="/proof" className="button button-primary">
                Open recorded proof <ArrowUpRight size={15} aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
