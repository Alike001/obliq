import { formatMinorUnits } from "@obliq/domain";
import { formatZecAmount } from "@obliq/zcash";
import { listSettlements } from "@obliq/database";
import Link from "next/link";
import { StateTag } from "@/components/state-tag";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const tenant = await getTenantContext();
  const rows = await listSettlements(getDatabase(), tenant.organizationId);
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">Settlement operations</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          Settlements
        </h1>
        <p className="text-muted mt-3 max-w-3xl text-sm leading-6">
          Business authorization, external cryptographic authorization,
          broadcast, and read-only reconciliation are separate stages. Obliq
          does not hold the signer credential.
        </p>
        {!rows.length ? (
          <section className="card mt-8 p-8">
            <h2 className="font-semibold">No settlement intents</h2>
            <p className="text-muted mt-2 text-sm">
              A version-bound intent can be prepared from an obligation only
              after it reaches READY_TO_SETTLE.
            </p>
            <Link href="/app/obligations" className="button button-dark mt-5">
              Review obligations
            </Link>
          </section>
        ) : (
          <section className="card mt-8 overflow-hidden">
            <div className="bg-sunken text-ink-3 hidden grid-cols-[1fr_1fr_1fr_1fr] gap-4 border-b p-4 text-[0.6875rem] font-bold tracking-[0.08em] uppercase md:grid">
              <span>Vendor / reference</span>
              <span>Business amount</span>
              <span>ZEC intent</span>
              <span>State</span>
            </div>
            <div className="divide-y">
              {rows.map(({ settlement, intent, obligation, vendor }) => (
                <Link
                  key={settlement.id}
                  href={`/app/settlements/${settlement.id}`}
                  className="grid gap-3 p-5 transition-colors hover:bg-stone-50 md:grid-cols-[1fr_1fr_1fr_1fr] md:items-center"
                >
                  <div>
                    <strong className="text-sm">{vendor.displayName}</strong>
                    <p className="text-muted mt-1 text-xs">
                      {obligation.reference}
                    </p>
                  </div>
                  <span className="text-sm">
                    {formatMinorUnits(
                      intent.businessAmountMinor,
                      intent.businessCurrency,
                    )}
                  </span>
                  <span className="font-mono text-sm">
                    {formatZecAmount(intent.zatoshiAmount)} ZEC
                  </span>
                  <span>
                    <StateTag state={settlement.state} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
