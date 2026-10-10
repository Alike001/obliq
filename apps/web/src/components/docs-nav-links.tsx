"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface DocsNavGroup {
  title: string;
  pages: readonly { slug: string; title: string }[];
  planned: readonly string[];
}

/** The documentation index, with the page being read marked as current. */
export function DocsNavLinks({
  groups,
  label,
}: {
  groups: readonly DocsNavGroup[];
  label: string;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="space-y-7">
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="eyebrow mb-3">{group.title}</h2>
          <ul className="space-y-1">
            {group.pages.map(({ slug, title }) => (
              <li key={slug}>
                <Link
                  href={`/docs/${slug}`}
                  className="doc-link"
                  aria-current={
                    pathname === `/docs/${slug}` ? "page" : undefined
                  }
                >
                  {title}
                </Link>
              </li>
            ))}
            {group.planned.map((title) => (
              <li
                key={title}
                className="text-ink-3 flex items-center justify-between gap-2 px-2 py-1.5 text-sm"
              >
                <span>{title}</span>
                <span className="cap cap-hatched text-[0.625rem]!">
                  Planned
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
