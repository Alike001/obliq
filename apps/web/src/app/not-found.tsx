import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isReadOnlyPreview, siteLinks } from "@/lib/site-links";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  const { primary } = siteLinks(isReadOnlyPreview());
  return (
    <>
      <a href="#main" className="button button-dark skip-link">
        Skip to content
      </a>
      <SiteHeader />
      <main
        id="main"
        className="page-wrap grid min-h-[60vh] place-items-center py-16"
      >
        <section className="card max-w-lg p-8">
          <p className="eyebrow">Not found</p>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            There is no page at this address.
          </h1>
          <p className="text-muted mt-3 text-sm leading-6">
            The link may be mistyped or out of date. Nothing was changed.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="button button-dark" href="/">
              Back to the start
            </Link>
            <Link className="button button-light" href="/docs">
              Documentation
            </Link>
            <Link className="button button-light" href={primary.href}>
              {primary.label}
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
