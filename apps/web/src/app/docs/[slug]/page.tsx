import { AlertTriangle, Info } from "lucide-react";
import { notFound } from "next/navigation";
import { DocsNav } from "@/components/docs-shell";
import { StatusPill } from "@/components/status-pill";
import { docs, getDoc } from "@/content/docs";

export function generateStaticParams() {
  return docs.map((doc) => ({ slug: doc.slug }));
}

export default async function DocArticle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const doc = getDoc((await params).slug);
  if (!doc) notFound();
  return (
    <>
      <main className="min-w-0 px-1 py-8 sm:px-7 lg:px-10 lg:py-14">
        <details className="card bg-panel mb-8 p-4 lg:hidden">
          <summary className="cursor-pointer text-sm font-semibold">
            Browse documentation
          </summary>
          <div className="mt-5">
            <DocsNav />
          </div>
        </details>
        <article className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <StatusPill status={doc.status} />
            <span className="text-muted text-xs">Phase 4 documentation</span>
          </div>
          <h1 className="mt-5 text-4xl font-medium tracking-[-.05em] sm:text-5xl">
            {doc.title}
          </h1>
          <p className="text-muted mt-5 text-lg leading-8">{doc.description}</p>
          <div className="mt-12 space-y-14">
            {doc.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24"
              >
                <h2 className="text-2xl font-semibold tracking-[-.035em]">
                  {section.title}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 30)}
                    className="text-muted mt-4 leading-7"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-5 space-y-3">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="text-muted flex gap-3 text-sm leading-6"
                      >
                        <span className="bg-forest mt-2 size-1.5 shrink-0 rounded-full" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
                {section.code && (
                  <pre className="bg-ink text-mint mt-5 overflow-x-auto rounded-xl p-5 font-mono text-xs leading-6">
                    <code>{section.code}</code>
                  </pre>
                )}
                {section.table && (
                  <div className="hairline mt-5 overflow-x-auto rounded-xl border">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead className="bg-stone-100">
                        <tr>
                          {section.table.headers.map((header) => (
                            <th
                              key={header}
                              className="hairline border-b px-4 py-3 font-semibold"
                            >
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.rows.map((row) => (
                          <tr
                            key={row.join(":")}
                            className="hairline border-b last:border-0"
                          >
                            {row.map((cell) => (
                              <td
                                key={cell}
                                className="text-muted first:text-ink px-4 py-3 first:font-mono first:text-xs"
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {section.callout && (
                  <div
                    className={`mt-6 flex gap-3 rounded-xl border p-4 ${section.callout.tone === "warning" ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}
                  >
                    {section.callout.tone === "warning" ? (
                      <AlertTriangle size={18} />
                    ) : (
                      <Info size={18} />
                    )}
                    <div>
                      <p className="text-sm font-semibold">
                        {section.callout.title}
                      </p>
                      <p className="text-muted mt-1 text-sm leading-6">
                        {section.callout.text}
                      </p>
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        </article>
      </main>
      <aside className="hidden py-14 pl-6 xl:block">
        <div className="sticky top-24">
          <p className="eyebrow">On this page</p>
          <nav className="mt-4 space-y-2" aria-label="On this page">
            {doc.sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="text-muted hover:text-ink block text-xs leading-5"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
