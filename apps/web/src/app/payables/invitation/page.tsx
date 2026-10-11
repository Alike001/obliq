import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { RecipientInvitationFlow } from "@/components/recipient-invitation-flow";

export const metadata: Metadata = {
  title: "Confirm payment details",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function RecipientInvitationPage() {
  return (
    <main className="min-h-screen bg-stone-100 px-4 py-5 sm:px-6 sm:py-8">
      <a href="#recipient-flow" className="button button-dark skip-link">
        Skip to confirmation
      </a>
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4 py-2">
          <Brand />
          <span className="tag">Private payables</span>
        </header>
        <div className="mt-8 grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-12">
          <section className="pt-2 lg:pt-8">
            <p className="eyebrow">Recipient confirmation</p>
            <h1 className="font-display mt-5 text-4xl leading-[1.02] font-semibold tracking-[-0.05em] sm:text-5xl">
              Confirm where this payable should be sent.
            </h1>
            <p className="text-muted mt-5 max-w-xl text-base leading-7">
              Review the obligation, verify your email contact and provide a
              shielded Zcash destination. The company&apos;s finance team still
              reviews the destination and separately authorizes any payment.
            </p>
            <ol className="mt-8 space-y-4 text-sm" aria-label="Process">
              <BoundaryStep number="01" label="Verify the invited contact" />
              <BoundaryStep number="02" label="Review the scoped payable" />
              <BoundaryStep
                number="03"
                label="Confirm a shielded destination"
              />
            </ol>
          </section>
          <RecipientInvitationFlow />
        </div>
        <footer className="text-muted mt-10 border-t py-6 text-xs leading-5">
          Obliq never asks for your seed phrase or spending key. This page
          cannot approve, sign, broadcast or settle a payment.
        </footer>
      </div>
    </main>
  );
}

function BoundaryStep({ number, label }: { number: string; label: string }) {
  return (
    <li className="flex items-center gap-4 border-t pt-4">
      <span className="font-mono text-xs font-semibold text-[#8a5a00]">
        {number}
      </span>
      <span className="font-medium">{label}</span>
    </li>
  );
}
