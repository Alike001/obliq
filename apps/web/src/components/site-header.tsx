import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { isReadOnlyPreview, siteLinks } from "@/lib/site-links";
import { Brand } from "./brand";

/** The header wraps on narrow screens; no link is hidden behind a script. */
export function SiteHeader() {
  const preview = isReadOnlyPreview();
  const { nav, primary } = siteLinks(preview);
  return (
    <header className="site-nav">
      <div className="page-wrap flex flex-wrap items-center justify-between gap-x-7 gap-y-0 py-3">
        <div className="flex flex-wrap items-center gap-x-3">
          <Brand />
          {preview && (
            <span className="cap cap-hatched">Read-only preview</span>
          )}
        </div>
        {/* Below 640px the links take their own row under the button. */}
        <nav
          aria-label="Primary"
          className="order-3 flex w-full flex-wrap items-center gap-x-7 sm:order-none sm:mr-auto sm:ml-6 sm:w-auto"
        >
          {nav.map(({ label, href }) => (
            <Link key={href} href={href} className="nav-link">
              {label}
            </Link>
          ))}
        </nav>
        <Link href={primary.href} className="button button-primary">
          {primary.label}
          <ArrowUpRight size={15} aria-hidden />
        </Link>
      </div>
    </header>
  );
}
