import { listVendors } from "@obliq/database";
import { Building2, Plus } from "lucide-react";
import Link from "next/link";
import { StateTag } from "@/components/state-tag";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const tenant = await getTenantContext();
  const vendors = await listVendors(getDatabase(), tenant.organizationId);
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Counterparties</p>
            <h1 className="mt-3 text-3xl font-medium tracking-tight">
              Vendors
            </h1>
            <p className="text-muted mt-2 text-sm">
              Organization-scoped payee records and destination history.
            </p>
          </div>
          <Link className="button button-dark" href="/app/vendors/new">
            <Plus size={16} />
            New vendor
          </Link>
        </div>
        {vendors.length === 0 ? (
          <section className="card empty mt-8">
            <span className="empty-icon">
              <Building2 size={20} aria-hidden />
            </span>
            <h2 className="font-semibold">Create your first vendor</h2>
            <p className="text-muted max-w-sm text-sm">
              A vendor is required before an obligation can be recorded.
            </p>
            <Link className="button button-dark mt-3" href="/app/vendors/new">
              Create vendor
            </Link>
          </section>
        ) : (
          <div className="card mt-8 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-stone-100/70 text-xs">
                  <tr>
                    <th className="p-4">Vendor</th>
                    <th>Legal name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v.id} className="hairline border-t">
                      <td className="p-4 font-semibold">
                        <Link href={`/app/vendors/${v.id}`}>
                          {v.displayName}
                        </Link>
                      </td>
                      <td>{v.legalName}</td>
                      <td>{v.category ?? "—"}</td>
                      <td>
                        <StateTag state={v.status} />
                      </td>
                      <td>{v.createdAt.toLocaleDateString()}</td>
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
