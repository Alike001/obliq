import Link from "next/link";
import { networkSummary } from "@/lib/network-claims";
import { readNetworkStatus } from "@/lib/network-status";
import { isReadOnlyPreview, siteLinks } from "@/lib/site-links";
import { Brand } from "./brand";

export function SiteFooter() {
  const { lead, rest } = networkSummary(readNetworkStatus().status);
  const preview = isReadOnlyPreview();
  return (
    <footer className="on-ink bg-ink text-[#c3ccd8]">
      <div className="page-wrap flex flex-wrap items-end justify-between gap-x-10 gap-y-6 py-10">
        <div>
          <Brand inverse />
          <p className="mt-3 max-w-xl text-[0.8125rem] leading-[1.45]">
            Private financial operations for crypto-native organizations. {lead}{" "}
            {rest}
            {preview &&
              " This is a read-only preview; the workspace is not available here."}
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6" aria-label="Footer">
          {siteLinks(preview).nav.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex min-h-11 items-center text-white hover:underline"
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
