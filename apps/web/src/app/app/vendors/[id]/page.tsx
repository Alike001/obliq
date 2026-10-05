import { getVendor, listVendorDestinations } from "@obliq/database";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/status-pill";
import { Field, Input } from "@/components/finance-form";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { addDestinationAction } from "../../actions";
export const dynamic = "force-dynamic";

export default async function VendorDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getTenantContext();
  const [vendor, destinations] = await Promise.all([
    getVendor(getDatabase(), tenant.organizationId, id),
    listVendorDestinations(getDatabase(), tenant.organizationId, id),
  ]);
  if (!vendor) notFound();
  const add = addDestinationAction.bind(null, id);
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <p className="eyebrow">Vendor record</p>
        <div className="mt-3 flex items-center gap-3">
          <h1 className="text-3xl font-medium tracking-tight">
            {vendor.displayName}
          </h1>
          <StatusPill status="IMPLEMENTED" />
        </div>
        <p className="text-muted mt-2 text-sm">
          {vendor.legalName} · {vendor.category ?? "Uncategorized"}
        </p>
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_.8fr]">
          <section className="card p-6">
            <h2 className="font-semibold">Payment destination history</h2>
            <p className="text-muted mt-1 text-xs">
              Manual records are never treated as cryptographically verified.
            </p>
            <div className="mt-5 space-y-3">
              {destinations.length ? (
                destinations.map((d) => (
                  <div key={d.id} className="rounded-lg border p-3 text-xs">
                    <div className="flex justify-between">
                      <strong>{d.network}</strong>
                      <span>{d.verificationStatus}</span>
                    </div>
                    <p className="mt-2 font-mono break-all">{d.receiver}</p>
                    <p className="text-muted mt-2">
                      Fingerprint {d.fingerprint.slice(0, 16)}… ·{" "}
                      {d.createdAt.toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-muted text-sm">No destination recorded.</p>
              )}
            </div>
          </section>
          <form action={add} className="card p-6">
            <h2 className="font-semibold">Add destination</h2>
            <p className="mt-2 text-xs text-amber-800">
              UNVERIFIED · This stores identity history only. It does not
              validate wallet control.
            </p>
            <div className="mt-5">
              <Field
                label="Zcash receiver"
                hint="Adding a destination supersedes the current unverified record without deleting history."
              >
                <Input
                  name="receiver"
                  required
                  minLength={20}
                  maxLength={512}
                />
              </Field>
            </div>
            <button className="button button-dark mt-5 w-full">
              Save unverified destination
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
