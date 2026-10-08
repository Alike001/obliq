import { formatMinorUnits } from "@obliq/domain";
import { listApprovalInbox } from "@obliq/database";
import { Check } from "lucide-react";
import Link from "next/link";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const actor = await getTenantContext();
  const items = await listApprovalInbox(getDatabase(), actor);
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow">Deliberate review</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          Approval inbox
        </h1>
        <p className="text-muted mt-2 text-sm">
          Only requirements your server-validated role may satisfy are shown.
        </p>
        {!items.length ? (
          <section className="card empty mt-8">
            <span className="empty-icon">
              <Check size={20} aria-hidden />
            </span>
            <h2 className="font-semibold">You are all caught up</h2>
            <p className="text-muted max-w-sm text-sm">
              There is nothing requiring your capacity right now.
            </p>
          </section>
        ) : (
          <div className="card mt-8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-stone-100/70 text-xs">
                  <tr>
                    <th className="p-4">Reference</th>
                    <th>Amount</th>
                    <th>Due</th>
                    <th>Requested capacity</th>
                    <th>Reason</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ requirement, obligation, user }) => (
                    <tr className="hairline border-t" key={requirement.id}>
                      <td className="p-4">
                        <strong>{obligation.reference}</strong>
                        <p className="text-muted text-xs">
                          Requested by{" "}
                          {user?.displayName ?? user?.email ?? "Unknown"}
                        </p>
                      </td>
                      <td className="font-mono">
                        {formatMinorUnits(
                          obligation.amountMinor,
                          obligation.currency,
                        )}
                      </td>
                      <td>{obligation.dueAt?.toLocaleDateString()}</td>
                      <td>
                        {requirement.role} · {requirement.approvedCount}/
                        {requirement.requiredCount}
                      </td>
                      <td>{requirement.reason}</td>
                      <td>
                        <Link
                          href={`/app/obligations/${obligation.id}`}
                          className="button button-light"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
