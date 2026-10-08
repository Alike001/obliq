import Link from "next/link";
import { networkSummary } from "@/lib/network-claims";
import { readNetworkStatus } from "@/lib/network-status";
import { isReadOnlyPreview, siteLinks } from "@/lib/site-links";
import { Brand } from "./brand";

export function SiteFooter() {
  const { lead, rest } = networkSummary(readNetworkStatus().status);
  const preview = isReadOnlyPreview();
  return (
    <footer className="site-footer">
      <div className="page-wrap flex flex-wrap items-end justify-between gap-x-10 gap-y-5 py-8">
        <div>
          <Brand />
          <p className="mt-2 max-w-xl leading-[1.55]">
            Private financial operations for crypto-native organizations. {lead}{" "}
            {rest}
            {preview &&
              " This is a read-only preview; the workspace is not available here."}
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6" aria-label="Footer">
          {siteLinks(preview).nav.map(({ label, href }) => (
            <Link key={href} href={href} className="nav-link">
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
