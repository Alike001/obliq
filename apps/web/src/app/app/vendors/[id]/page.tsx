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
import {
  canIssueInvitations,
  canReviewDestinations,
  isRecipientSubmitted,
} from "@/lib/recipient-invitations";
import { getTenantContext } from "@/lib/session";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";
import {
  addDestinationAction,
  updateVendorContactAction,
  updatePilotVendorAction,
  verifyDestinationAction,
} from "../../actions";

export const metadata = { title: "Vendor" };
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
    verificationError?: string;
    contact?: string;
    contactError?: string;
    revoked?: string;
    updated?: string;
  }>;
}) {
  const { id } = await params;
  const notice = await searchParams;
  const tenant = await getTenantContext();
  const pilot = getRuntimeSecurityConfig().deploymentMode === "pilot";
  const [vendor, destinations, history] = await Promise.all([
    getVendor(getDatabase(), tenant.organizationId, id),
    listVendorDestinations(getDatabase(), tenant.organizationId, id),
    listObligations(getDatabase(), tenant.organizationId, { vendorId: id }),
  ]);
  if (!vendor) notFound();
  const add = addDestinationAction.bind(null, id);
  // Chooses what to show. The server action checks the role again.
  const canVerify = canReviewDestinations(tenant.role);
  const canManageContact = canIssueInvitations(tenant.role);
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
        {notice.updated && (
          <Notice
            tone="done"
            title="Fictional vendor updated"
            live
            className="mt-6"
          >
            The persisted vendor record and audit history were updated.
          </Notice>
        )}
        {pilot && (
          <form
            action={updatePilotVendorAction.bind(null, id)}
            className="card mt-6 grid gap-4 p-5 sm:grid-cols-3 sm:items-end"
          >
            <Field label="Display name">
              <Input
                name="displayName"
                required
                maxLength={100}
                defaultValue={vendor.displayName}
              />
            </Field>
            <Field label="Legal name">
              <Input
                name="legalName"
                required
                maxLength={160}
                defaultValue={vendor.legalName}
              />
            </Field>
            <Field label="Category (optional)">
              <Input
                name="category"
                maxLength={80}
                defaultValue={vendor.category ?? ""}
              />
            </Field>
            <SubmitButton pendingLabel="Saving…">
              Save fictional vendor
            </SubmitButton>
          </form>
        )}
        {notice.destination === "added" && (
          <Notice
            tone="hold"
            title="Destination saved as unverified"
            live
            className="mt-6"
          >
            {destinations.length > 1
              ? "It replaced the previous destination, and approvals that relied on the old one no longer count. "
              : "This is the vendor's first destination. "}
            It still needs manual verification.
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
        {notice.verificationError && (
          <Notice
            tone="stop"
            title="Manual verification was not recorded"
            live
            className="mt-6"
          >
            {notice.verificationError === "INDEPENDENT_REVIEW_REQUIRED"
              ? "The member who issued the recipient invitation cannot independently verify its destination. Ask another Owner, CFO or Treasury member to review it."
              : notice.verificationError === "FORBIDDEN"
                ? "Your role cannot verify payment destinations."
                : notice.verificationError === "INVALID_INPUT"
                  ? "Provide both a verification method and a useful review note."
                  : "This destination is no longer current or reviewable. Refresh the record before trying again."}
          </Notice>
        )}
        {notice.contact === "updated" && (
          <Notice
            tone="done"
            title="Vendor contact updated"
            live
            className="mt-6"
          >
            The new email applies only to future invitations.
            {Number(notice.revoked ?? "0") > 0
              ? `${notice.revoked} outstanding invitation(s) and their recipient sessions were revoked.`
              : "No outstanding invitation needed revocation."}
          </Notice>
        )}
        {notice.contactError && (
          <Notice
            tone="stop"
            title="Vendor contact was not changed"
            live
            className="mt-6"
          >
            {notice.contactError === "FORBIDDEN"
              ? "Only an Owner, CFO or Finance member can change the recipient contact."
              : notice.contactError === "CONTACT_UNCHANGED"
                ? "That email is already the current recipient contact."
                : notice.contactError === "NOT_FOUND"
                  ? "This vendor is not available in your organization."
                  : "Enter a valid email address and try again."}
          </Notice>
        )}
        {canManageContact && !pilot && (
          <form
            action={updateVendorContactAction.bind(null, id)}
            className="card mt-6 grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-end"
          >
            <Field
              label="Recipient contact email"
              hint="Changing it revokes every open invitation and verified recipient session. Existing links never redirect to the new contact."
            >
              <Input
                name="contactEmail"
                type="email"
                required
                defaultValue={vendor.contactEmail ?? ""}
                autoComplete="off"
              />
            </Field>
            <SubmitButton pendingLabel="Updating…">Update contact</SubmitButton>
          </form>
        )}
        {pilot ? (
          <Notice
            tone="hold"
            title="Payment destinations are disabled in the public pilot"
            className="mt-8"
          >
            Do not enter real Zcash addresses or wallet information. Destination
            confirmation and independent review require verified organization
            identities and are not guest actions.
          </Notice>
        ) : (
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
                        Version {d.version} · fingerprint{" "}
                        {d.fingerprint.slice(0, 16)}… · added{" "}
                        {d.createdAt.toLocaleString()}
                      </p>
                      {isRecipientSubmitted(d) && (
                        <p className="mt-3 leading-5">
                          <span className="scope">Recipient submitted</span>{" "}
                          <span className="text-muted">
                            Entered through a private payables link after an
                            email check. That shows access to the
                            contact&rsquo;s mailbox. It is not proof of who
                            controls the wallet.
                            {d.verificationStatus === "UNVERIFIED" &&
                              !d.supersededAt &&
                              " The member who sent the link cannot record this verification."}
                          </span>
                        </p>
                      )}
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
                            action={verifyDestinationAction.bind(
                              null,
                              id,
                              d.id,
                            )}
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
        )}
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
