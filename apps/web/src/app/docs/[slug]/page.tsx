import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocsNav, docNeighbours } from "@/components/docs-shell";
import { Notice } from "@/components/notice";
import { StatusPill } from "@/components/status-pill";
import { docs, getDoc } from "@/content/docs";

export function generateStaticParams() {
  return docs.map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const doc = getDoc((await params).slug);
  return doc ? { title: doc.title, description: doc.description } : {};
}

export default async function DocArticle({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const doc = getDoc((await params).slug);
  if (!doc) notFound();
  const { previous, next } = docNeighbours(doc.slug);
  return (
    <>
      <main
        id="doc-main"
        tabIndex={-1}
        className="min-w-0 py-8 sm:px-7 lg:px-10 lg:py-14"
      >
        <details className="card bg-panel mb-4 p-4 lg:hidden">
          <summary className="cursor-pointer text-sm font-semibold">
            Browse documentation
          </summary>
          <div className="mt-5">
            <DocsNav label="Documentation, all pages" />
          </div>
        </details>
        {doc.sections.length > 1 && (
          <details className="card bg-panel mb-8 p-4 xl:hidden">
            <summary className="cursor-pointer text-sm font-semibold">
              On this page
            </summary>
            <nav className="doc-toc mt-3" aria-label="On this page">
              {doc.sections.map((section) => (
                <a key={section.id} href={`#${section.id}`}>
                  {section.title}
                </a>
              ))}
            </nav>
          </details>
        )}
        <article className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={doc.status} />
            <span className="text-muted text-xs">Phase 5 documentation</span>
          </div>
          <h1 className="mt-5 text-4xl font-medium tracking-[-.05em] break-words sm:text-5xl">
            {doc.title}
          </h1>
          <p className="text-muted mt-5 text-lg leading-8">{doc.description}</p>
          <div className="mt-12 space-y-14">
            {doc.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24"
                aria-labelledby={`${section.id}-h`}
              >
                <h2
                  id={`${section.id}-h`}
                  className="text-2xl font-semibold tracking-[-.035em]"
                >
                  {section.title}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph.slice(0, 30)}
                    className="text-muted mt-4 max-w-[68ch] leading-7"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-5 space-y-3">
                    {section.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="text-muted flex max-w-[68ch] gap-3 leading-7"
                      >
                        <span
                          className="bg-carbon mt-[0.7rem] size-1.5 shrink-0 rounded-full"
                          aria-hidden
                        />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
                {section.code && (
                  <pre
                    className="bg-carbon text-mint mt-5 overflow-x-auto rounded-xl p-5 text-xs leading-6"
                    tabIndex={0}
                    aria-label={`${section.title}, code`}
                  >
                    <code>{section.code}</code>
                  </pre>
                )}
                {section.table && (
                  <div
                    className="hairline mt-5 overflow-x-auto rounded-xl border"
                    tabIndex={0}
                    role="region"
                    aria-label={`${section.title}, table`}
                  >
                    <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                      <thead className="bg-sunken">
                        <tr>
                          {section.table.headers.map((header) => (
                            <th
                              key={header}
                              scope="col"
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
                            {row.map((cell, index) =>
                              index === 0 ? (
                                <th
                                  key={cell}
                                  scope="row"
                                  className="text-ink px-4 py-3 text-left align-top text-xs font-semibold"
                                >
                                  {cell}
                                </th>
                              ) : (
                                <td
                                  key={cell}
                                  className="text-muted px-4 py-3 align-top"
                                >
                                  {cell}
                                </td>
                              ),
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {section.callout && (
                  <Notice
                    tone={section.callout.tone === "warning" ? "hold" : "info"}
                    title={section.callout.title}
                    className="mt-6"
                  >
                    {section.callout.text}
                  </Notice>
                )}
              </section>
            ))}
          </div>
          {(previous || next) && (
            <nav
              className="hairline mt-16 grid gap-3 border-t pt-8 sm:grid-cols-2"
              aria-label="More documentation"
            >
              {previous ? (
                <Link href={`/docs/${previous.slug}`} className="card p-4">
                  <span className="text-muted block text-xs">Previous</span>
                  <span className="mt-1 block font-semibold">
                    {previous.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {next && (
                <Link
                  href={`/docs/${next.slug}`}
                  className="card p-4 sm:text-right"
                >
                  <span className="text-muted block text-xs">Next</span>
                  <span className="mt-1 block font-semibold">{next.title}</span>
                </Link>
              )}
            </nav>
          )}
        </article>
      </main>
      {doc.sections.length > 1 && (
        <aside className="hidden py-14 pl-6 xl:block">
          <div className="sticky top-24">
            <p className="eyebrow">On this page</p>
            <nav className="doc-toc mt-4" aria-label="On this page, sidebar">
              {doc.sections.map((section) => (
                <a key={section.id} href={`#${section.id}`}>
                  {section.title}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}
    </>
  );
}
