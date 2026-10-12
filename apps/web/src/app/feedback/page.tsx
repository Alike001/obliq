import type { Metadata } from "next";
import { ArrowUpRight, MessageSquareText } from "lucide-react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { publicFeedbackUrl } from "@/lib/public-feedback";

export const metadata: Metadata = {
  title: "Give feedback",
  description: "Share structured feedback after trying the Obliq sandbox.",
};

const prompts = [
  [
    "Your role",
    "Finance operator, founder, treasury lead, contractor, vendor, or another perspective.",
  ],
  [
    "Workflow clarity",
    "What did you understand quickly, and where did the payable flow become unclear?",
  ],
  [
    "Confusing steps",
    "Which control, approval, destination-review, or readiness step needs a better explanation?",
  ],
  [
    "Missing capability",
    "What would Obliq need before you could test it with fictional payables at your organization?",
  ],
  [
    "Optional contact",
    "Share contact details only if you want a follow-up. It is never required by Obliq.",
  ],
] as const;

export default function FeedbackPage() {
  const feedbackUrl = publicFeedbackUrl();
  return (
    <>
      <a href="#feedback-main" className="button button-dark skip-link">
        Skip to feedback guidance
      </a>
      <SiteHeader />
      <main id="feedback-main" tabIndex={-1}>
        <section className="on-ink bg-carbon text-white">
          <div className="page-wrap py-16 md:py-20">
            <p className="eyebrow">Public product feedback</p>
            <h1 className="section-title mt-5 max-w-3xl">
              Tell us where private payables still feel difficult.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/70">
              Try one fictional payable first, then share what was clear,
              confusing, or missing. Obliq does not receive or store responses
              on this preview; the form is operated at the owner-configured
              external destination.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/demo" className="button button-primary">
                Try the sandbox first
              </Link>
              {feedbackUrl && (
                <a
                  href={feedbackUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="button button-light"
                >
                  Open feedback form <ArrowUpRight size={15} aria-hidden />
                </a>
              )}
            </div>
          </div>
        </section>

        <section
          className="page-wrap py-14 md:py-20"
          aria-labelledby="prompts-heading"
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.7fr)]">
            <div>
              <p className="eyebrow">Five useful prompts</p>
              <h2 id="prompts-heading" className="t-title mt-4">
                Feedback grounded in the workflow
              </h2>
              <ol className="sheet steps mt-6">
                {prompts.map(([title, detail]) => (
                  <li key={title}>
                    <div>
                      <h3 className="font-semibold">{title}</h3>
                      <p className="t-small mt-1">{detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
            <aside className="space-y-4">
              <div className="notice notice-hold items-start!" role="note">
                <MessageSquareText className="glyph" aria-hidden />
                <div>
                  <strong>Use fictional, non-sensitive examples</strong>
                  <p>
                    Never submit wallet keys, seed phrases, viewing keys,
                    payment credentials, invoice files, financial records, or
                    private destination addresses.
                  </p>
                </div>
              </div>
              {!feedbackUrl && (
                <div className="notice notice-hatched" role="status">
                  <span className="glyph glyph-unknown" aria-hidden />
                  <div>
                    <strong>External form not configured</strong>
                    <p>
                      The owner must set a reviewed HTTPS feedback URL before
                      responses can be collected. Obliq does not silently fall
                      back to an internal submission endpoint.
                    </p>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
