import { listVendors } from "@obliq/database";
import Link from "next/link";
import { ObligationForm } from "@/components/obligation-form";
import { BackLink } from "@/components/record";
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
        <BackLink href="/app/obligations" label="Obligations" />
        <p className="eyebrow mt-3">Manual source</p>
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
          <section className="card empty mt-8">
            <h2 className="font-semibold">A vendor is required first</h2>
            <p className="text-muted max-w-sm text-sm">
              An obligation is always owed to a vendor, and this organization
              has none yet. Nothing has been recorded.
            </p>
            <Link href="/app/vendors/new" className="button button-dark mt-3">
              Create vendor
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
