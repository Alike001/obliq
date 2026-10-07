import Link from "next/link";
import { Brand } from "./brand";

const links = [
  ["Product", "/app"],
  ["Documentation", "/docs"],
  ["Security", "/security"],
  ["Proof", "/proof"],
] as const;

export function SiteHeader() {
  const preview = process.env.OBLIQ_DEPLOYMENT_MODE === "preview";
  const visibleLinks = preview
    ? links.filter(([label]) => label !== "Product")
    : links;
  return (
    <header className="border-ink/10 bg-paper/90 border-b backdrop-blur">
      <div className="page-wrap flex h-18 items-center justify-between">
        <Brand />
        <nav
          aria-label="Primary"
          className="text-muted hidden items-center gap-7 text-sm md:flex"
        >
          {visibleLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="hover:text-ink transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link href={preview ? "/proof" : "/app"} className="button button-dark">
          {preview ? "View proof" : "Open foundation"}{" "}
          <span aria-hidden>↗</span>
        </Link>
      </div>
    </header>
  );
}
