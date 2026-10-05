import {
  BarChart3,
  Building2,
  CheckSquare,
  FileCheck2,
  FileText,
  Landmark,
  Library,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { Brand } from "./brand";
import { StatusPill } from "./status-pill";

export const appSections = [
  ["Overview", "/app", BarChart3, "IMPLEMENTED"],
  ["Obligations", "/app/obligations", FileText, "PLANNED"],
  ["Vendors", "/app/vendors", Building2, "PLANNED"],
  ["Approvals", "/app/approvals", CheckSquare, "PLANNED"],
  ["Settlements", "/app/settlements", Landmark, "UNAVAILABLE"],
  ["Ledger", "/app/ledger", Library, "PLANNED"],
  ["Evidence", "/app/evidence", FileCheck2, "PLANNED"],
  ["Policies", "/app/policies", SlidersHorizontal, "PLANNED"],
  ["Settings", "/app/settings", Settings, "PLANNED"],
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#eef0eb] lg:grid lg:grid-cols-[244px_1fr]">
      <aside className="bg-ink hidden min-h-screen border-r border-white/10 p-5 text-white lg:flex lg:flex-col">
        <Brand inverse />
        <div className="mt-9 rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs font-medium">Obliq Studio</p>
          <p className="mt-1 text-[11px] text-white/45">
            Development workspace
          </p>
        </div>
        <nav className="mt-6 space-y-1" aria-label="Application">
          {appSections.map(([label, href, Icon, status]) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white/65 transition hover:bg-white/7 hover:text-white"
            >
              <Icon size={16} />
              <span className="flex-1">{label}</span>
              {status !== "IMPLEMENTED" && (
                <span
                  className="size-1.5 rounded-full bg-white/25"
                  title={status}
                />
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-5 text-[11px] leading-5 text-white/45">
          Phase 0 · No live financial operations
        </div>
      </aside>
      <div>
        <header className="hairline bg-panel flex h-16 items-center justify-between border-b px-4 md:px-7">
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <span className="size-2 rounded-full bg-emerald-600" />
            <span className="text-muted text-xs">Foundation environment</span>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill status="SEEDED" />
            <div className="bg-forest grid size-8 place-items-center rounded-full text-xs font-semibold text-white">
              OS
            </div>
          </div>
        </header>
        <nav
          className="hairline bg-panel flex gap-2 overflow-x-auto border-b px-3 py-2 lg:hidden"
          aria-label="Application mobile"
        >
          {appSections.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="text-muted hover:bg-paper rounded-full px-3 py-1.5 text-xs whitespace-nowrap"
            >
              {label}
            </Link>
          ))}
        </nav>
        {children}
      </div>
    </div>
  );
}
