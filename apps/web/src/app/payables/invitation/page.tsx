import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Brand } from "@/components/brand";
import { RecipientFlow } from "@/components/recipient-flow";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Confirm a payment address",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/**
 * The page a recipient reaches from an invitation email. It renders the same
 * fixed text for every visitor: the one-time token arrives in the URL
 * fragment, which the browser never sends here, so the server knows nothing
 * about who opened it. Everything specific is fetched by the browser from the
 * private-payables endpoints after the email check.
 */
export default function RecipientInvitationPage() {
  // The public preview has no database and serves no recipient endpoint.
  if (getRuntimeSecurityConfig().deploymentMode === "preview") notFound();
  return (
    <div className="recipient-page">
      <a href="#recipient-main" className="skip-link">
        Skip to content
      </a>
      <header className="hairline bg-surface border-b">
        <div className="page-wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
          <Brand />
          <span className="cap">Private payables link</span>
        </div>
      </header>
      <main id="recipient-main" className="page-wrap py-8 sm:py-12">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow">Payment address request</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight">
            Tell the payer where to send it
          </h1>
          <div className="mt-7">
            <RecipientFlow />
          </div>
          <noscript>
            <div className="notice notice-stop mt-5" role="alert">
              <span className="glyph glyph-stop" aria-hidden />
              <div>
                <strong>This page needs JavaScript</strong>
                <p>
                  The access in your link is read by your browser and is never
                  sent in the page address. Turn JavaScript on, then open the
                  link in your email again.
                </p>
              </div>
            </div>
          </noscript>
          <section className="mt-8" aria-labelledby="recipient-scope-h">
            <h2 id="recipient-scope-h" className="text-sm font-bold">
              What this page does and does not do
            </h2>
            <ul className="text-muted mt-3 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
              <li className="flex gap-3">
                <span
                  className="glyph glyph-done text-clear mt-1.5"
                  aria-hidden
                />
                <span>
                  Checks that you can read the email address the payer has on
                  record for you.
                </span>
              </li>
              <li className="flex gap-3">
                <span
                  className="glyph glyph-done text-clear mt-1.5"
                  aria-hidden
                />
                <span>
                  Records one shielded Zcash address from you, marked
                  unverified, for the payer to review.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="glyph glyph-unknown mt-1.5" aria-hidden />
                <span>
                  Does not prove who controls the address. Obliq never asks for
                  a seed phrase, a private key or a viewing key.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="glyph glyph-unknown mt-1.5" aria-hidden />
                <span>
                  Does not approve, sign, send or schedule a payment. Only the
                  payer can do that, under their own controls.
                </span>
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
