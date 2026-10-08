import { SideNav, TabNav } from "./app-nav";
import { Brand } from "./brand";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";

export { appSections } from "./app-sections";

export function AppShell({ children }: { children: React.ReactNode }) {
  const runtime = getRuntimeSecurityConfig();
  return (
    <div className="bg-canvas min-h-screen lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="side-nav on-ink sticky top-0 hidden h-screen overflow-y-auto p-5 lg:flex lg:flex-col">
        <Brand inverse />
        <div className="border-carbon-2 mt-7 rounded-[9px] border bg-[rgb(255_255_255/0.05)] p-3">
          <p className="text-sm font-semibold">Obliq Studio</p>
          <p className="text-on-carbon-2 mt-0.5 text-xs">
            {runtime.deploymentMode === "production"
              ? "Production workspace"
              : "Development workspace"}
          </p>
        </div>
        <SideNav />
        <div className="border-carbon-2 text-on-carbon-2 mt-auto border-t pt-5 text-xs leading-5">
          Phase 6 · Hardened boundaries · {runtime.network.toUpperCase()}
        </div>
      </aside>
      <div className="min-w-0">
        <header className="hairline bg-panel flex h-16 items-center justify-between gap-3 border-b px-4 md:px-8">
          <div className="lg:hidden">
            <Brand />
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <span className="glyph glyph-done text-emerald-600" aria-hidden />
            <span className="text-muted text-[0.8125rem]">
              {runtime.authMode === "oidc"
                ? "OIDC session"
                : "Development identity"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* Hatched unless this workspace runs on the public network. */}
            <span
              className={
                runtime.network === "mainnet" ? "cap" : "cap cap-hatched"
              }
            >
              {runtime.network.toUpperCase()}
            </span>
            {runtime.authMode === "oidc" && (
              <form action="/auth/logout" method="post">
                <button className="nav-link cursor-pointer">Sign out</button>
              </form>
            )}
            <div
              className="bg-gold text-carbon grid size-9 place-items-center rounded-full text-xs font-bold"
              aria-hidden
            >
              OS
            </div>
          </div>
        </header>
        <TabNav />
        <div className="app-main">{children}</div>
      </div>
    </div>
  );
}
