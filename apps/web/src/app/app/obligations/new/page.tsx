import { listVendors } from "@obliq/database";
import Link from "next/link";
import { ObligationForm } from "@/components/obligation-form";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { createManualObligationAction } from "../../actions";
export const dynamic = "force-dynamic";

export default async function NewObligationPage() {
  const tenant = await getTenantContext();
  const vendors = await listVendors(getDatabase(), tenant.organizationId);
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">Manual source</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          Record an obligation
        </h1>
        <p className="text-muted mt-2 text-sm">
          Enter the source-of-truth values yourself. AI is never required.
        </p>
        {vendors.length ? (
          <ObligationForm
            vendors={vendors}
            action={createManualObligationAction}
          />
        ) : (
          <section className="card mt-8 p-8">
            <h2 className="font-semibold">A vendor is required</h2>
            <p className="text-muted mt-2 text-sm">
              Obligations cannot exist without a counterparty.
            </p>
            <Link href="/app/vendors/new" className="button button-dark mt-5">
              Create vendor
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
