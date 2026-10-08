import Link from "next/link";
import { Brand } from "./brand";
import { docGroups, docs } from "@/content/docs";
import { isReadOnlyPreview } from "@/lib/site-links";

export function DocsShell({ children }: { children: React.ReactNode }) {
  // The read-only preview serves no workspace, so it offers no link to one.
  const readOnlyPreview = isReadOnlyPreview();
  return (
    <div className="min-h-screen">
      <header className="site-nav">
        <div className="page-wrap flex h-16 items-center justify-between">
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
            <span className="bg-carbon rounded-full px-3 py-1.5 text-xs font-semibold text-white">
              Docs · Phase 5
            </span>
          </div>
        </div>
      </header>
      <div className="page-wrap grid lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_190px]">
        {" "}
        <aside className="hairline hidden border-r py-10 pr-6 lg:block">
          <DocsNav />
        </aside>
        {children}
      </div>
    </div>
  );
}

export function DocsNav() {
  return (
    <nav aria-label="Documentation" className="space-y-7">
      {docGroups.map((group) => (
        <section key={group.title}>
          <h2 className="eyebrow mb-3">{group.title}</h2>
          <ul className="space-y-1">
            {group.pages.map((slug) => {
              const doc = docs.find((item) => item.slug === slug);
              return doc ? (
                <li key={slug}>
                  <Link
                    href={`/docs/${slug}`}
                    className="text-muted hover:text-ink block rounded-md px-2 py-1.5 text-sm hover:bg-white"
                  >
                    {doc.title}
                  </Link>
                </li>
              ) : null;
            })}
            {group.planned.map((title) => (
              <li
                key={title}
                className="text-muted/55 flex items-center justify-between gap-2 px-2 py-1 text-xs"
              >
                <span>{title}</span>
                <span className="font-mono text-[8px] tracking-wider">
                  PLANNED
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
