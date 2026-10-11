"use client";

import type { RecipientInvitationRevocationReason } from "@obliq/domain";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "@/components/notice";
import {
  type InvitationState,
  type RevokeResult,
  invitationCanBeRevoked,
  invitationAdministrationMessage,
  invitationStateDetail,
  invitationStateLabel,
  issueFailure,
  parseIssueReply,
  parseRevokeReply,
  revocationReasons,
} from "@/lib/recipient-invitations";

export interface InvitationRow {
  id: string;
  issuedAt: string;
  expiresAt: string | null;
  issuedBy: string | null;
  state: InvitationState;
  consumedAt: string | null;
  revokedAt: string | null;
  reasonCode: string | null;
  deliveryState: string;
}

type Sent =
  | { kind: "SENT"; expiresAt: string }
  | { kind: "REFUSED"; message: string }
  | { kind: "UNCERTAIN" };

const stateTag: Record<InvitationState, string> = {
  ACTIVE: "tag tag-hold",
  CONTACT_VERIFIED: "tag tag-hold",
  CONSUMED: "tag tag-done",
  EXPIRED: "tag",
  REVOKED: "tag tag-stop",
  SUPERSEDED: "tag",
};
const stateGlyph: Record<InvitationState, string> = {
  ACTIVE: "glyph glyph-wait",
  CONTACT_VERIFIED: "glyph glyph-wait",
  CONSUMED: "glyph glyph-done",
  EXPIRED: "glyph",
  REVOKED: "glyph glyph-stop",
  SUPERSEDED: "glyph",
};

async function send(path: string, method: "POST" | "DELETE", body: unknown) {
  try {
    const response = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store",
    });
    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      // A reply without JSON carries only its status.
    }
    return { status: response.status, body: parsed };
  } catch {
    return null;
  }
}

/**
 * Sends and revokes recipient invitations for one obligation through the
 * private-payables endpoints. The server derives the organization and role
 * from the session and decides every request; this only reports its reply.
 */
export function RecipientInvitationPanel({
  obligationId,
  vendorHref,
  contactEmail,
  blockers,
  canRevoke,
  invitations,
}: {
  obligationId: string;
  vendorHref: string | null;
  contactEmail: string | null;
  blockers: readonly string[];
  canRevoke: boolean;
  invitations: readonly InvitationRow[];
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [reason, setReason] =
    useState<RecipientInvitationRevocationReason>("SENT_IN_ERROR");
  const [working, setWorking] = useState(false);
  const [revoked, setRevoked] = useState<Record<string, RevokeResult>>({});
  const [revokeErrors, setRevokeErrors] = useState<Record<string, string>>({});

  const mayHaveOpen = invitations.some(
    (item) =>
      invitationCanBeRevoked(item.state) &&
      revoked[item.id] !== "REVOKED" &&
      revoked[item.id] !== "NOT_OPEN",
  );

  async function issue() {
    setSending(true);
    setSent(null);
    const reply = await send("/api/private-payables/invitations", "POST", {
      obligationId,
    });
    setSending(false);
    setConfirming(false);
    if (!reply) setSent({ kind: "UNCERTAIN" });
    else {
      const result = parseIssueReply(reply.status, reply.body);
      setSent(
        result
          ? { kind: "SENT", expiresAt: result.expiresAt.toLocaleString() }
          : issueFailure(reply.status, reply.body),
      );
    }
    router.refresh();
  }

  async function revoke(id: string) {
    setWorking(true);
    const reply = await send(
      `/api/private-payables/invitations/${encodeURIComponent(id)}`,
      "DELETE",
      { reasonCode: reason },
    );
    setWorking(false);
    setRevoking(null);
    setRevoked((current) => ({
      ...current,
      [id]: reply ? parseRevokeReply(reply.status, reply.body) : "UNCERTAIN",
    }));
    if (reply && reply.status < 500) {
      const message = invitationAdministrationMessage(reply.body);
      if (message)
        setRevokeErrors((current) => ({ ...current, [id]: message }));
    }
    router.refresh();
  }

  return (
    <section
      className="card mt-5 overflow-hidden"
      aria-labelledby="recipient-link-h"
    >
      <div className="hairline border-b p-5">
        <h2 id="recipient-link-h" className="font-semibold">
          Private payables link
        </h2>
        <p className="text-muted mt-1 text-xs">
          Asks the vendor&rsquo;s contact to submit a shielded address for this
          obligation. It gives them no access to the workspace and cannot
          approve, sign or send a payment.
        </p>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1fr]">
        <div>
          <p className="fact-label">Link goes to</p>
          <p className="fact-value">
            {contactEmail ?? "No contact email on record"}
          </p>
          <p className="text-muted mt-1 text-xs">
            The vendor&rsquo;s recorded contact. It cannot be changed from this
            panel.{" "}
            {vendorHref && (
              <Link href={vendorHref} className="font-semibold underline">
                Open vendor
              </Link>
            )}
          </p>

          {blockers.length > 0 ? (
            <Notice
              tone="hatched"
              title="An invitation cannot be sent"
              className="mt-5 text-sm"
            >
              {blockers.join(" ")}
            </Notice>
          ) : confirming ? (
            <div className="border-line mt-5 rounded-lg border p-4">
              <p className="text-sm font-semibold">
                Email a one-time link to {contactEmail}?
              </p>
              <p className="text-muted mt-1 text-xs leading-5">
                The link works for 24 hours.
                {mayHaveOpen &&
                  " Any earlier link to this vendor that is still open stops working."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="button button-dark"
                  onClick={() => void issue()}
                  disabled={sending}
                  aria-busy={sending || undefined}
                >
                  {sending ? "Sending…" : "Send link"}
                </button>
                <button
                  type="button"
                  className="button button-light"
                  onClick={() => setConfirming(false)}
                  disabled={sending}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="button button-dark mt-5"
              onClick={() => {
                setSent(null);
                setConfirming(true);
              }}
            >
              {invitations.length ? "Send a new link" : "Email invitation link"}
            </button>
          )}

          {sent?.kind === "SENT" && (
            <Notice
              tone="done"
              title="Invitation accepted for delivery"
              live
              className="mt-5 text-sm"
            >
              State: Active. It expires {sent.expiresAt}. The private mail
              adapter accepted the link for the recorded contact; the link is
              never shown in the workspace.
            </Notice>
          )}
          {sent?.kind === "REFUSED" && (
            <Notice
              tone="stop"
              title="The invitation was not sent"
              live
              className="mt-5 text-sm"
            >
              {sent.message}
            </Notice>
          )}
          {sent?.kind === "UNCERTAIN" && (
            <Notice
              tone="hold"
              title="We do not know whether it was sent"
              live
              className="mt-5 text-sm"
            >
              The server did not return a result. An invitation may have been
              created and emailed. Check the list below, which shows the saved
              state, before sending again. Do not assume it was delivered.
            </Notice>
          )}
        </div>

        <div>
          <p className="fact-label">What a link proves</p>
          <ul className="mt-2 space-y-2 text-sm">
            <li className="flex gap-3">
              <span
                className="glyph glyph-done text-clear mt-1.5"
                aria-hidden
              />
              <span>
                Someone who could read the contact&rsquo;s email submitted the
                address.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="glyph glyph-unknown mt-1.5" aria-hidden />
              <span>
                It does not prove who controls the wallet. A compromised mailbox
                can submit an attacker&rsquo;s address.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="glyph glyph-wait text-hold mt-1.5" aria-hidden />
              <span>
                The address arrives <strong>Unverified</strong> and replaces the
                vendor&rsquo;s current destination. Earlier approvals stop
                counting. An Owner, CFO or Treasury member other than the sender
                must review it before the obligation can be ready to settle.
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="hairline border-t">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pt-5">
          <h3 className="text-sm font-semibold">
            Invitations created for this obligation
          </h3>
          <p className="text-ink-3 text-xs">Saved state</p>
        </div>
        {invitations.length ? (
          <ol className="mt-3">
            {invitations.map((invitation) => {
              const result = revoked[invitation.id];
              return (
                <li
                  key={invitation.id}
                  className="hairline border-t px-5 py-4 text-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-mono text-xs font-semibold">
                          {invitation.id.slice(0, 8)}…
                        </span>
                        {result === "REVOKED" ? (
                          <span className="tag tag-stop">
                            <span className="glyph glyph-stop" aria-hidden />
                            Revoked
                          </span>
                        ) : (
                          <span className={stateTag[invitation.state]}>
                            <span
                              className={stateGlyph[invitation.state]}
                              aria-hidden
                            />
                            {invitationStateLabel[invitation.state]}
                          </span>
                        )}
                      </p>
                      <p className="text-muted mt-2 text-xs leading-5">
                        Created {invitation.issuedAt}
                        {invitation.issuedBy &&
                          ` by ${invitation.issuedBy.slice(0, 8)}…`}
                        {invitation.expiresAt &&
                          ` · expires ${invitation.expiresAt}`}
                        {invitation.consumedAt &&
                          ` · submitted ${invitation.consumedAt}`}
                        {invitation.revokedAt &&
                          ` · closed ${invitation.revokedAt}`}
                      </p>
                      <p className="text-muted mt-1 text-xs leading-5">
                        {result === "REVOKED"
                          ? "Revoked just now. The link and any verified session stopped working."
                          : invitationStateDetail[invitation.state]}
                        {invitation.reasonCode &&
                          ` Reason: ${invitation.reasonCode}.`}
                      </p>
                      <p className="text-muted mt-1 text-xs leading-5">
                        <span>Delivery: </span>
                        {invitation.deliveryState === "ACCEPTED"
                          ? "accepted by the configured private mail adapter"
                          : invitation.deliveryState === "FAILED"
                            ? "failed; this invitation is not usable"
                            : "not confirmed; do not assume the email was delivered"}
                        .
                      </p>
                    </div>
                    {canRevoke &&
                      invitationCanBeRevoked(invitation.state) &&
                      // A refused or unanswered revoke can be tried again.
                      result !== "REVOKED" &&
                      result !== "NOT_OPEN" &&
                      revoking !== invitation.id && (
                        <button
                          type="button"
                          className="button button-light"
                          onClick={() => setRevoking(invitation.id)}
                        >
                          Revoke
                        </button>
                      )}
                  </div>
                  {revoking === invitation.id && (
                    <form
                      className="mt-4 flex flex-wrap items-end gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void revoke(invitation.id);
                      }}
                    >
                      <label className="min-w-0 flex-1 basis-56 text-xs font-semibold">
                        Reason for revoking
                        <select
                          className="hairline bg-panel mt-1 block min-h-11 w-full rounded-lg border px-3 text-sm font-normal"
                          value={reason}
                          onChange={(event) =>
                            setReason(
                              event.target
                                .value as RecipientInvitationRevocationReason,
                            )
                          }
                          disabled={working}
                        >
                          {revocationReasons.map((item) => (
                            <option key={item.code} value={item.code}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="submit"
                        className="button button-dark"
                        disabled={working}
                        aria-busy={working || undefined}
                      >
                        {working ? "Revoking…" : "Revoke invitation"}
                      </button>
                      <button
                        type="button"
                        className="button button-light"
                        onClick={() => setRevoking(null)}
                        disabled={working}
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                  {result === "NOT_OPEN" && (
                    <Notice
                      tone="info"
                      title="There was nothing to revoke"
                      live
                      className="mt-4 text-sm"
                    >
                      This invitation is no longer open. It was already used,
                      revoked, replaced or expired. This request changed
                      nothing.
                    </Notice>
                  )}
                  {result === "REFUSED" && (
                    <Notice
                      tone="stop"
                      title="The invitation was not revoked"
                      live
                      className="mt-4 text-sm"
                    >
                      {revokeErrors[invitation.id] ??
                        "The server refused the request, so the link is still open."}
                    </Notice>
                  )}
                  {result === "UNCERTAIN" && (
                    <Notice
                      tone="hold"
                      title="We do not know whether it was revoked"
                      live
                      className="mt-4 text-sm"
                    >
                      The server did not return a result. Treat the link as
                      still open until the state above reads Revoked. Reload
                      this page to see the saved state, then revoke again if it
                      is still open.
                    </Notice>
                  )}
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-muted px-5 pt-2 pb-5 text-sm">None yet.</p>
        )}
        <p className="text-ink-3 hairline border-t px-5 py-4 text-xs leading-5">
          These states come from tenant-scoped invitation records, not audit
          inference. A submitted address still appears as an unverified,
          immutable destination version on the vendor record.
        </p>
      </div>
    </section>
  );
}
