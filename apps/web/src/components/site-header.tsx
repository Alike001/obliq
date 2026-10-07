import Link from "next/link";
import { isReadOnlyPreview, siteLinks } from "@/lib/site-links";
import { Brand } from "./brand";

/** The header wraps on narrow screens; no link is hidden behind a script. */
export function SiteHeader() {
  const preview = isReadOnlyPreview();
  const { nav, primary } = siteLinks(preview);
  return (
    <header className="border-line bg-surface border-b">
      <div className="page-wrap flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3">
        <div className="flex flex-wrap items-center gap-x-3">
          <Brand />
          {preview && (
            <span className="cap cap-hatched">Read-only preview</span>
          )}
        </div>
        {/* Below 640px the links take their own row under the button. */}
        <nav
          aria-label="Primary"
          className="order-3 flex w-full flex-wrap items-center gap-x-6 sm:order-none sm:ml-auto sm:w-auto"
        >
          {nav.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className="text-ink inline-flex min-h-11 items-center no-underline hover:underline"
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link href={primary.href} className="button button-dark">
          {primary.label}
        </Link>
      </div>
    </header>
  );
}
