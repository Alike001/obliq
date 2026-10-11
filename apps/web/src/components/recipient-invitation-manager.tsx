"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Notice } from "./notice";
import { StateTag } from "./state-tag";

export interface RecipientInvitationView {
  id: string;
  state: string;
  network: string;
  expiresAt: string;
  consumedAt: string | null;
  createdAt: string;
}

export function RecipientInvitationManager({
  obligationId,
  invitation,
  canAdminister,
  contactAvailable,
  terminal,
}: {
  obligationId: string;
  invitation: RecipientInvitationView | null;
  canAdminister: boolean;
  contactAvailable: boolean;
  terminal: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    tone: "done" | "stop";
    title: string;
    detail: string;
  } | null>(null);
  const visibleState = invitation?.state;

  async function issue() {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/private-payables/invitations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ obligationId }),
      });
      if (!response.ok) throw new Error("issue failed");
      setMessage({
        tone: "done",
        title: "Invitation issued",
        detail:
          "A 24-hour link was sent to the vendor contact. The secret is not visible in this workspace.",
      });
      router.refresh();
    } catch {
      setMessage({
        tone: "stop",
        title: "Invitation was not issued",
        detail:
          "Check the vendor contact and email service. No active invitation should be inferred from this attempt.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!invitation) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/private-payables/invitations/${encodeURIComponent(invitation.id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reasonCode: "SENT_IN_ERROR" }),
        },
      );
      if (!response.ok) throw new Error("revoke failed");
      setMessage({
        tone: "done",
        title: "Invitation revoked",
        detail:
          "Its verification challenges and recipient sessions can no longer authorize a destination confirmation.",
      });
      router.refresh();
    } catch {
      setMessage({
        tone: "stop",
        title: "Revocation could not be confirmed",
        detail:
          "Treat the invitation as active until the workspace shows otherwise.",
      });
    } finally {
      setBusy(false);
    }
  }

  const canRevoke =
    canAdminister &&
    invitation &&
    ["ACTIVE", "CONTACT_VERIFIED"].includes(visibleState ?? "");

  return (
    <section
      className="card mt-5 overflow-hidden"
      aria-labelledby="recipient-h"
    >
      <div className="hairline flex flex-wrap items-start justify-between gap-4 border-b p-5">
        <div>
          <h2 id="recipient-h" className="font-semibold">
            Recipient destination confirmation
          </h2>
          <p className="text-muted mt-1 max-w-2xl text-xs leading-5">
            Email contact verification is not wallet ownership proof. A
            recipient-confirmed destination remains unverified until an
            independent finance reviewer checks it.
          </p>
        </div>
        {visibleState && <StateTag state={visibleState} />}
      </div>
      <div className="p-5">
        {message && (
          <Notice
            tone={message.tone}
            title={message.title}
            live
            className="mb-5"
          >
            {message.detail}
          </Notice>
        )}
        {invitation ? (
          <dl className="grid gap-4 sm:grid-cols-3">
            <InvitationFact label="Network" value={invitation.network} />
            <InvitationFact
              label="Issued"
              value={new Date(invitation.createdAt).toLocaleString()}
            />
            <InvitationFact
              label="Expires"
              value={new Date(invitation.expiresAt).toLocaleString()}
            />
          </dl>
        ) : (
          <p className="text-muted text-sm">
            No invitation has been issued for this obligation.
          </p>
        )}
        {invitation?.consumedAt && (
          <Notice
            tone="hold"
            title="Recipient-confirmed destination awaiting review"
            className="mt-5"
          >
            The immutable destination version is saved as UNVERIFIED. Review it
            from the vendor record; the invitation issuer cannot independently
            verify it.
          </Notice>
        )}
        {!contactAvailable && (
          <Notice tone="hold" title="Vendor email required" className="mt-5">
            Add a finance contact email to the vendor record before issuing an
            invitation.
          </Notice>
        )}
        {!canAdminister && (
          <p className="text-muted mt-5 text-xs">
            Only an Owner, CFO or Finance member can issue or revoke an
            invitation.
          </p>
        )}
        {canAdminister && !terminal && contactAvailable && (
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              className="button button-dark"
              disabled={busy}
              onClick={() => void issue()}
            >
              {busy
                ? "Working…"
                : invitation &&
                    ["ACTIVE", "CONTACT_VERIFIED"].includes(visibleState ?? "")
                  ? "Replace invitation"
                  : "Issue 24-hour invitation"}
            </button>
            {canRevoke && (
              <button
                type="button"
                className="button button-light"
                disabled={busy}
                onClick={() => void revoke()}
              >
                Revoke invitation
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function InvitationFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="fact-label">{label}</dt>
      <dd className="mt-1 text-sm font-medium capitalize">{value}</dd>
    </div>
  );
}
