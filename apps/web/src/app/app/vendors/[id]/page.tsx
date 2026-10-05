import {
  getVendor,
  listObligations,
  listVendorDestinations,
} from "@obliq/database";
import { notFound } from "next/navigation";
import { StatusPill } from "@/components/status-pill";
import { Field, Input } from "@/components/finance-form";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { addDestinationAction, verifyDestinationAction } from "../../actions";
export const dynamic = "force-dynamic";

export default async function VendorDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await getTenantContext();
  const [vendor, destinations, history] = await Promise.all([
    getVendor(getDatabase(), tenant.organizationId, id),
    listVendorDestinations(getDatabase(), tenant.organizationId, id),
    listObligations(getDatabase(), tenant.organizationId, { vendorId: id }),
  ]);
  if (!vendor) notFound();
  const add = addDestinationAction.bind(null, id);
  const canVerify = ["OWNER", "CFO", "TREASURY"].includes(tenant.role);
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
                    {d.verifiedAt && (
                      <p className="mt-2 text-emerald-800">
                        Verified manually {d.verifiedAt.toLocaleString()} ·{" "}
                        {d.verificationMethod} · actor{" "}
                        {d.verifiedBy?.slice(0, 8)}…
                      </p>
                    )}
                    {d.verificationStatus === "UNVERIFIED" && canVerify && (
                      <form
                        action={verifyDestinationAction.bind(null, id, d.id)}
                        className="mt-3 grid gap-2"
                      >
                        <input
                          name="method"
                          required
                          minLength={3}
                          placeholder="Method (for example, video call)"
                          className="min-h-10 rounded-lg border px-3"
                        />
                        <input
                          name="note"
                          required
                          minLength={3}
                          placeholder="Verification note"
                          className="min-h-10 rounded-lg border px-3"
                        />
                        <button className="button button-dark">
                          Record manual verification
                        </button>
                      </form>
                    )}
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
              UNVERIFIED · This supersedes the current destination and
              invalidates affected approvals. It does not validate wallet
              control.
            </p>
            <div className="mt-5">
              <Field
                label="Zcash receiver"
                hint="Adding a destination supersedes the current record without deleting history."
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
        <section className="card mt-5 p-6">
          <h2 className="font-semibold">Obligation history</h2>
          <div className="mt-4 divide-y">
            {history.length ? (
              history.map(({ obligation }) => (
                <a
                  href={`/app/obligations/${obligation.id}`}
                  key={obligation.id}
                  className="flex justify-between gap-3 py-3 text-sm"
                >
                  <span>{obligation.reference}</span>
                  <strong>{obligation.state}</strong>
                </a>
              ))
            ) : (
              <p className="text-muted text-sm">No obligations yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
