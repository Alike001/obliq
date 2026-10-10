import Link from "next/link";
import { Brand } from "./brand";
import { DocsNavLinks } from "./docs-nav-links";
import { docGroups, docs } from "@/content/docs";
import { isReadOnlyPreview } from "@/lib/site-links";

export function DocsShell({ children }: { children: React.ReactNode }) {
  // The read-only preview serves no workspace, so it offers no link to one.
  const readOnlyPreview = isReadOnlyPreview();
  return (
    <div className="min-h-screen">
      <a href="#doc-main" className="button button-dark skip-link">
        Skip to content
      </a>
      <header className="site-nav">
        <div className="page-wrap flex min-h-16 flex-wrap items-center justify-between gap-x-5">
          <Brand />
          <div className="flex items-center gap-5 text-sm">
            {!readOnlyPreview && (
              <Link href="/app" className="nav-link">
                Product
              </Link>
            )}
            <Link href="/security" className="nav-link">
              Security
            </Link>
            <Link href="/proof" className="nav-link">
              Proof
            </Link>
            <span className="bg-carbon hidden rounded-full px-3 py-1.5 text-xs font-semibold text-white sm:inline">
              Docs · Phase 5
            </span>
          </div>
        </div>
      </header>
      <div className="page-wrap grid lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_190px]">
        <aside className="hairline hidden border-r py-10 pr-6 lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto">
            <DocsNav />
          </div>
        </aside>
        {children}
      </div>
    </div>
  );
}

/** `label` tells two copies of the index apart when both are on the page. */
export function DocsNav({ label = "Documentation" }: { label?: string }) {
  const groups = docGroups.map((group) => ({
    title: group.title,
    pages: group.pages.flatMap((slug) => {
      const doc = docs.find((item) => item.slug === slug);
      return doc ? [{ slug, title: doc.title }] : [];
    }),
    planned: group.planned,
  }));
  return <DocsNavLinks groups={groups} label={label} />;
}

/** The pages before and after one, in the order the index lists them. */
export function docNeighbours(slug: string) {
  const order = docGroups
    .flatMap((group) => group.pages)
    .flatMap((item) => {
      const doc = docs.find((entry) => entry.slug === item);
      return doc ? [doc] : [];
    });
  const index = order.findIndex((doc) => doc.slug === slug);
  return {
    previous: index > 0 ? order[index - 1] : undefined,
    next: index >= 0 ? order[index + 1] : undefined,
  };
}
