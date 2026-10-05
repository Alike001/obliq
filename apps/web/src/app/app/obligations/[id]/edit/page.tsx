import { getObligation, listVendors } from "@obliq/database";
import { notFound } from "next/navigation";
import { ObligationForm } from "@/components/obligation-form";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { updateObligationAction } from "../../../actions";
export const dynamic = "force-dynamic";

export default async function EditObligationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getTenantContext();
  const [record, vendors] = await Promise.all([
    getObligation(getDatabase(), tenant.organizationId, id),
    listVendors(getDatabase(), tenant.organizationId),
  ]);
  if (!record) notFound();
  const o = record.obligation;
  const action = updateObligationAction.bind(null, id);
  const defaults = {
    vendorId: o.vendorId ?? "",
    type: o.type,
    reference: o.reference,
    currency: o.currency,
    amount: `${o.amountMinor / 100n}.${(o.amountMinor % 100n).toString().padStart(2, "0")}`,
    dueDate: o.dueAt?.toISOString().slice(0, 10) ?? "",
    category: o.category ?? "",
    description: o.description,
  };
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <p className="eyebrow">Version {o.version}</p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          Edit obligation
        </h1>
        <p className="text-muted mt-2 text-sm">
          Material edits increment the record version and append audit history.
        </p>
        <ObligationForm
          vendors={vendors}
          action={action}
          defaults={defaults}
          submitLabel="Save new version"
        />
      </div>
    </main>
  );
}
