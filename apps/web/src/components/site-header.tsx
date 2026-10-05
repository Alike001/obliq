import Link from "next/link";
import { Brand } from "./brand";

const links = [
  ["Product", "/app"],
  ["Documentation", "/docs"],
  ["Security", "/security"],
  ["Proof", "/proof"],
] as const;

export function SiteHeader() {
  return (
    <header className="border-ink/10 bg-paper/90 border-b backdrop-blur">
      <div className="page-wrap flex h-18 items-center justify-between">
        <Brand />
        <nav
          aria-label="Primary"
          className="text-muted hidden items-center gap-7 text-sm md:flex"
        >
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="hover:text-ink transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/app" className="button button-dark">
          Open foundation <span aria-hidden>↗</span>
        </Link>
      </div>
    </header>
  );
}
