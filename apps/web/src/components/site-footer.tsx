import Link from "next/link";
import { Brand } from "./brand";

export function SiteFooter() {
  const preview = process.env.OBLIQ_DEPLOYMENT_MODE === "preview";
  return (
    <footer className="bg-ink text-white">
      <div className="page-wrap grid gap-10 py-12 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <Brand inverse />
          <p className="mt-5 max-w-md text-sm leading-6 text-white/55">
            Private financial operations for crypto-native organizations.{" "}
            {preview
              ? "Public preview—financial operations and public-network settlement are unavailable."
              : "Foundation phase—no live settlement capability yet."}
          </p>
        </div>
        <nav
          className="flex flex-wrap gap-6 text-sm text-white/65"
          aria-label="Footer"
        >
          <Link href="/docs">Docs</Link>
          <Link href="/security">Security</Link>
          <Link href="/proof">Proof</Link>
        </nav>
      </div>
    </footer>
  );
}
