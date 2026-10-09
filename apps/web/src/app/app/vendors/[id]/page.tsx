import {
  getVendor,
  listObligations,
  listVendorDestinations,
} from "@obliq/database";
import { formatMinorUnits } from "@obliq/domain";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Field, Input } from "@/components/finance-form";
import { Notice } from "@/components/notice";
import { BackLink } from "@/components/record";
import { StateTag } from "@/components/state-tag";
import { SubmitButton } from "@/components/submit-button";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { addDestinationAction, verifyDestinationAction } from "../../actions";
export const dynamic = "force-dynamic";

export default async function VendorDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    created?: string;
    destination?: string;
    verified?: string;
  }>;
}) {
  const { id } = await params;
  const notice = await searchParams;
  const tenant = await getTenantContext();
  const [vendor, destinations, history] = await Promise.all([
    getVendor(getDatabase(), tenant.organizationId, id),
    listVendorDestinations(getDatabase(), tenant.organizationId, id),
    listObligations(getDatabase(), tenant.organizationId, { vendorId: id }),
  ]);
  if (!vendor) notFound();
  const add = addDestinationAction.bind(null, id);
  // Chooses what to show. The server action checks the role again.
  const canVerify = ["OWNER", "CFO", "TREASURY"].includes(tenant.role);
  const current = destinations.find((d) => !d.supersededAt);
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <BackLink href="/app/vendors" label="Vendors" />
        <p className="eyebrow mt-3">Vendor record</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-medium tracking-tight">
            {vendor.displayName}
          </h1>
          <StateTag state={vendor.status} />
        </div>
        <p className="text-muted mt-2 text-sm">
          {vendor.legalName} · {vendor.category ?? "Uncategorized"}
        </p>
        {notice.created && (
          <Notice tone="done" title="Vendor created" live className="mt-6">
            It has no payment destination yet. Add one below before an
            obligation to this vendor can be settled.
          </Notice>
        )}
        {notice.destination === "added" && (
          <Notice
            tone="hold"
            title="Destination saved as unverified"
            live
            className="mt-6"
          >
            It replaced the previous destination, and approvals that relied on
            the old one no longer count. It still needs manual verification.
          </Notice>
        )}
        {notice.verified && (
          <Notice
            tone="done"
            title="Manual verification recorded"
            live
            className="mt-6"
          >
            This records that a person checked the destination. It is not
            cryptographic proof of who controls the wallet.
          </Notice>
        )}
        <div className="mt-8 grid gap-5 lg:grid-cols-[1fr_.8fr]">
          <section className="card p-6" aria-labelledby="destinations-h">
            <h2 id="destinations-h" className="font-semibold">
              Payment destination history
            </h2>
            <p className="text-muted mt-1 text-xs">
              Newest first. Manual records are never treated as
              cryptographically verified.
            </p>
            {destinations.length ? (
              <ol className="mt-5 space-y-3">
                {destinations.map((d) => (
                  <li
                    key={d.id}
                    className="border-line rounded-lg border p-4 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <strong className="text-sm">
                        {d.network}
                        {d === current && (
                          <span className="text-muted font-normal">
                            {" "}
                            · current
                          </span>
                        )}
                      </strong>
                      <StateTag
                        state={
                          d.supersededAt ? "SUPERSEDED" : d.verificationStatus
                        }
                      />
                    </div>
                    <p className="mt-3 font-mono break-all">{d.receiver}</p>
                    <p className="text-muted mt-2">
                      Fingerprint {d.fingerprint.slice(0, 16)}… · added{" "}
                      {d.createdAt.toLocaleString()}
                    </p>
                    {d.verifiedAt && (
                      <p className="mt-2 font-medium">
                        Verified manually {d.verifiedAt.toLocaleString()} ·{" "}
                        {d.verificationMethod} · actor{" "}
                        {d.verifiedBy?.slice(0, 8)}…
                      </p>
                    )}
                    {d.verificationStatus === "UNVERIFIED" &&
                      !d.supersededAt &&
                      (canVerify ? (
                        <form
                          action={verifyDestinationAction.bind(null, id, d.id)}
                          className="border-line mt-4 grid gap-3 border-t pt-4"
                        >
                          <Field
                            label="How it was verified"
                            hint="For example: video call with the vendor's finance contact."
                          >
                            <Input name="method" required minLength={3} />
                          </Field>
                          <Field label="Verification note">
                            <Input name="note" required minLength={3} />
                          </Field>
                          <SubmitButton pendingLabel="Recording…">
                            Record manual verification
                          </SubmitButton>
                        </form>
                      ) : (
                        <p className="text-muted mt-3">
                          An Owner, CFO or Treasury member can record manual
                          verification.
                        </p>
                      ))}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted mt-5 text-sm">
                No destination recorded. Obligations to this vendor cannot be
                settled until one is added and verified.
              </p>
            )}
          </section>
          <form action={add} className="card self-start p-6">
            <h2 className="font-semibold">
              {current ? "Replace destination" : "Add destination"}
            </h2>
            <Notice
              tone="hold"
              title="Saved as unverified"
              className="mt-4 text-xs"
            >
              {current
                ? "This supersedes the current destination and invalidates approvals that relied on it. "
                : ""}
              Saving does not prove who controls the wallet.
            </Notice>
            <div className="mt-5">
              <Field
                label="Zcash receiver"
                hint="The earlier record is kept in the history, never deleted."
              >
                <Input
                  name="receiver"
                  required
                  minLength={20}
                  maxLength={512}
                  autoComplete="off"
                  spellCheck={false}
                  className="font-mono"
                />
              </Field>
            </div>
            <SubmitButton
              className="button button-dark mt-5 w-full"
              pendingLabel="Saving…"
            >
              Save unverified destination
            </SubmitButton>
          </form>
        </div>
        <section className="card mt-5 overflow-hidden" aria-labelledby="ob-h">
          <div className="hairline border-b p-5">
            <h2 id="ob-h" className="font-semibold">
              Obligation history
            </h2>
          </div>
          {history.length ? (
            <ul>
              {history.map(({ obligation }) => (
                <li
                  key={obligation.id}
                  className="hairline border-t first:border-t-0"
                >
                  <Link
                    href={`/app/obligations/${obligation.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm transition-colors hover:bg-stone-50"
                  >
                    <span className="min-w-0">
                      <strong className="break-words">
                        {obligation.reference}
                      </strong>
                      <span className="text-muted mt-1 block text-xs">
                        Due{" "}
                        {obligation.dueAt?.toLocaleDateString() ??
                          "date not set"}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-3">
                      <span className="font-mono font-semibold">
                        {formatMinorUnits(
                          obligation.amountMinor,
                          obligation.currency,
                        )}
                      </span>
                      <StateTag state={obligation.state} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted p-5 text-sm">
              No obligations recorded for this vendor.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
