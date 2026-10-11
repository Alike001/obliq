"use client";

import { formatMinorUnits } from "@obliq/domain";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Field, Input } from "./finance-form";
import { Notice } from "./notice";
import { StateTag } from "./state-tag";
import {
  classifyDestinationFailure,
  consumeInvitationToken,
  destinationAttemptFor,
  parseRecipientSession,
  type RecipientSessionSummary,
} from "@/lib/recipient-flow";

type Stage =
  | "INITIALIZING"
  | "INVITATION"
  | "CHALLENGE"
  | "SUMMARY"
  | "CONFIRMED"
  | "SERVICE_ERROR"
  | "UNAVAILABLE";

type Feedback = {
  tone: "done" | "hold" | "stop" | "info";
  title: string;
  detail: string;
} | null;

const apiHeaders = { "Content-Type": "application/json" } as const;

export function RecipientInvitationFlow() {
  const initialized = useRef(false);
  const invitationToken = useRef<string | null>(null);
  const retry = useRef<{ receiver: string; key: string } | null>(null);
  const [stage, setStage] = useState<Stage>("INITIALIZING");
  const [session, setSession] = useState<RecipientSessionSummary | null>(null);
  const [code, setCode] = useState("");
  const [receiver, setReceiver] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    invitationToken.current = consumeInvitationToken(window.location, history);
    void resumeOrStart();

    async function resumeOrStart() {
      const restored = await loadSession();
      if (restored === "ACTIVE") return;
      if (restored === "UNAVAILABLE" && !invitationToken.current) {
        setStage("SERVICE_ERROR");
        return;
      }
      setStage(invitationToken.current ? "INVITATION" : "UNAVAILABLE");
    }
  }, []);

  useEffect(() => {
    if (stage !== "SUMMARY") return;
    let active = true;
    async function revalidate() {
      try {
        const response = await fetch("/api/private-payables/session", {
          credentials: "same-origin",
          cache: "no-store",
        });
        if (!active) return;
        if (response.status === 404) {
          setSession(null);
          setStage("UNAVAILABLE");
          return;
        }
        if (!response.ok) return;
        const current = parseRecipientSession(await response.json());
        if (!current) {
          setSession(null);
          setStage("UNAVAILABLE");
        } else {
          setSession(current);
        }
      } catch {
        // An outage is not an authorization conclusion. Mutations still recheck
        // the session server-side and fail closed.
      }
    }
    const onVisible = () => {
      if (document.visibilityState === "visible") void revalidate();
    };
    const onFocus = () => void revalidate();
    const onPageShow = () => void revalidate();
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(() => void revalidate(), 60_000);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [stage]);

  async function loadSession() {
    try {
      const response = await fetch("/api/private-payables/session", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok)
        return response.status === 404
          ? ("ABSENT" as const)
          : ("UNAVAILABLE" as const);
      const summary = parseRecipientSession(await response.json());
      if (!summary) return "UNAVAILABLE" as const;
      invitationToken.current = null;
      setSession(summary);
      setStage("SUMMARY");
      return "ACTIVE" as const;
    } catch {
      return "UNAVAILABLE" as const;
    }
  }

  async function requestChallenge() {
    const token = invitationToken.current;
    if (!token) return setStage("UNAVAILABLE");
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/private-payables/challenges", {
        method: "POST",
        credentials: "same-origin",
        headers: apiHeaders,
        body: JSON.stringify({ invitationToken: token }),
      });
      if (!response.ok) throw new Error("challenge unavailable");
      setStage("CHALLENGE");
      setFeedback({
        tone: "info",
        title: "Check the invited inbox",
        detail:
          "If this invitation is still valid, a six-digit code has been sent. The response is deliberately neutral to protect recipient privacy.",
      });
    } catch {
      setFeedback({
        tone: "stop",
        title: "The verification service is unavailable",
        detail: "Nothing was confirmed. Wait a moment, then try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = invitationToken.current;
    if (!token || !/^\d{6}$/u.test(code)) return;
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/private-payables/verify-contact", {
        method: "POST",
        credentials: "same-origin",
        headers: apiHeaders,
        body: JSON.stringify({ invitationToken: token, code }),
      });
      if (!response.ok) {
        setFeedback({
          tone: "stop",
          title: "That code could not be verified",
          detail:
            "It may be incorrect, expired or linked to an invitation that is no longer active. Request a new code or ask the finance team for a new invitation.",
        });
        return;
      }
      setCode("");
      invitationToken.current = null;
      if ((await loadSession()) !== "ACTIVE")
        throw new Error("session unavailable");
    } catch {
      setFeedback({
        tone: "stop",
        title: "Verification could not be completed",
        detail:
          "No destination was confirmed. Retry when the service is available.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function confirmDestination(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = receiver.trim();
    if (!normalized) return;
    retry.current = destinationAttemptFor(retry.current, normalized, () =>
      crypto.randomUUID(),
    );
    const attempt = retry.current;
    setBusy(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/private-payables/destination", {
        method: "POST",
        credentials: "same-origin",
        headers: apiHeaders,
        body: JSON.stringify({
          receiver: attempt.receiver,
          idempotencyKey: attempt.key,
        }),
      });
      if (!response.ok) {
        const failure = classifyDestinationFailure(response.status);
        if (failure === "INVALID") {
          retry.current = null;
          setFeedback({
            tone: "stop",
            title: "Use a shielded address for the stated network",
            detail:
              "The address was rejected. Confirm the network and use a Unified Address with an Orchard receiver and no transparent receiver.",
          });
        } else if (failure === "EXPIRED") {
          setStage("UNAVAILABLE");
        } else if (failure === "CONFLICT") {
          setFeedback({
            tone: "stop",
            title: "This retry does not match the earlier request",
            detail:
              "Nothing new was confirmed. Reload the invitation before trying a different destination.",
          });
        } else {
          setFeedback({
            tone: "hold",
            title: "The result is uncertain",
            detail:
              "Do not submit a different address. Retry this exact request; Obliq will reuse its idempotency key and recover the prior result if it was saved.",
          });
        }
        return;
      }
      const result = (await response.json()) as Record<string, unknown>;
      if (
        result.status !== "RECIPIENT_CONFIRMED" ||
        result.verificationStatus !== "UNVERIFIED" ||
        result.addressOwnershipProof !== "UNAVAILABLE"
      )
        throw new Error("unexpected destination response");
      retry.current = null;
      setReceiver("");
      setStage("CONFIRMED");
    } catch {
      setFeedback({
        tone: "hold",
        title: "The result is uncertain",
        detail:
          "Do not submit a different address. Retry this exact request; Obliq will reuse its idempotency key and recover the prior result if it was saved.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="recipient-flow"
      className="card overflow-hidden bg-white shadow-[0_18px_60px_rgba(17,17,17,0.08)]"
      aria-labelledby="flow-title"
      aria-busy={busy || undefined}
    >
      <div className="border-b bg-[#161616] px-5 py-5 text-white sm:px-7">
        <p className="text-xs font-semibold tracking-[0.13em] text-[#f0c66e] uppercase">
          Scoped recipient access
        </p>
        <h2 id="flow-title" className="mt-2 text-xl font-semibold">
          {stageTitle(stage)}
        </h2>
      </div>
      <div className="p-5 sm:p-7">
        {feedback && (
          <Notice
            tone={feedback.tone}
            title={feedback.title}
            live
            className="mb-6"
          >
            {feedback.detail}
          </Notice>
        )}
        {stage === "INITIALIZING" && <Initializing />}
        {stage === "INVITATION" && (
          <InvitationEntry
            busy={busy}
            onContinue={() => void requestChallenge()}
          />
        )}
        {stage === "CHALLENGE" && (
          <form onSubmit={(event) => void verifyCode(event)} noValidate>
            <Field
              label="Six-digit verification code"
              hint="Codes expire after 10 minutes. Obliq will never ask for a wallet secret."
            >
              <Input
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/gu, "").slice(0, 6))
                }
                name="verification-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                minLength={6}
                maxLength={6}
                required
                disabled={busy}
                aria-describedby="code-boundary"
                className="text-lg tracking-[0.25em]"
              />
            </Field>
            <p id="code-boundary" className="text-muted mt-4 text-xs leading-5">
              Email verification confirms access to the invited contact only. It
              does not prove control of any Zcash address.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                className="button button-dark"
                disabled={busy || code.length !== 6}
              >
                {busy ? "Verifying…" : "Verify contact"}
              </button>
              <button
                type="button"
                className="button button-light"
                disabled={busy}
                onClick={() => void requestChallenge()}
              >
                Send a new code
              </button>
            </div>
          </form>
        )}
        {stage === "SUMMARY" && session && (
          <ObligationSummary
            session={session}
            receiver={receiver}
            busy={busy}
            onReceiverChange={(value) => {
              if (retry.current && retry.current.receiver !== value.trim())
                retry.current = null;
              setReceiver(value);
            }}
            onSubmit={(event) => void confirmDestination(event)}
          />
        )}
        {stage === "CONFIRMED" && <Confirmation />}
        {stage === "SERVICE_ERROR" && <ServiceError />}
        {stage === "UNAVAILABLE" && <Unavailable />}
      </div>
    </section>
  );
}

function stageTitle(stage: Stage) {
  if (stage === "CHALLENGE") return "Verify the invited email";
  if (stage === "SUMMARY") return "Review and confirm";
  if (stage === "CONFIRMED") return "Destination received";
  if (stage === "SERVICE_ERROR") return "Service unavailable";
  if (stage === "UNAVAILABLE") return "Invitation unavailable";
  return "Open your invitation";
}

function Initializing() {
  return (
    <div role="status" className="py-10 text-center">
      <span className="glyph glyph-wait mx-auto" aria-hidden />
      <p className="mt-4 font-semibold">Checking this invitation…</p>
      <p className="text-muted mt-1 text-sm">
        No financial action is occurring.
      </p>
    </div>
  );
}

function InvitationEntry({
  busy,
  onContinue,
}: {
  busy: boolean;
  onContinue: () => void;
}) {
  return (
    <div>
      <p className="text-sm leading-6">
        Obliq will send a short-lived code to the email address selected by the
        company&apos;s finance team. The invitation secret has already been
        removed from the address bar.
      </p>
      <Notice tone="info" title="No wallet connection" className="mt-5">
        You will provide a receiving address only. Never enter a seed phrase,
        private key or wallet password.
      </Notice>
      <button
        type="button"
        className="button button-dark mt-6 w-full sm:w-auto"
        disabled={busy}
        onClick={onContinue}
      >
        {busy ? "Requesting code…" : "Send verification code"}
      </button>
    </div>
  );
}

function ObligationSummary({
  session,
  receiver,
  busy,
  onReceiverChange,
  onSubmit,
}: {
  session: RecipientSessionSummary;
  receiver: string;
  busy: boolean;
  onReceiverChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const amount = formatMinorUnits(
    BigInt(session.obligation.amountMinor),
    session.obligation.currency,
  );
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="fact-label">Invited obligation</p>
          <p className="mt-1 text-lg font-semibold break-words">
            {session.obligation.reference}
          </p>
        </div>
        <StateTag state="CONTACT_VERIFIED" />
      </div>
      <dl className="mt-5 grid gap-4 rounded-xl bg-stone-100 p-4 sm:grid-cols-2">
        <div>
          <dt className="fact-label">Amount</dt>
          <dd className="mt-1 font-mono font-semibold">{amount}</dd>
        </div>
        <div>
          <dt className="fact-label">Due</dt>
          <dd className="mt-1 font-medium">
            {session.obligation.dueAt
              ? new Date(session.obligation.dueAt).toLocaleDateString()
              : "Not specified"}
          </dd>
        </div>
        <div>
          <dt className="fact-label">Zcash network</dt>
          <dd className="mt-1 font-medium capitalize">{session.network}</dd>
        </div>
        <div>
          <dt className="fact-label">Session expires</dt>
          <dd className="mt-1 font-medium">
            {new Date(session.expiresAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </dd>
        </div>
      </dl>
      <Notice
        tone="hold"
        title="Contact verified, wallet ownership unproven"
        className="mt-5"
      >
        Access to the invited email does not establish control of the address
        below. Finance must independently review it before approvals can count.
      </Notice>
      <form onSubmit={onSubmit} className="mt-6" noValidate>
        <Field
          label="Shielded Zcash Unified Address"
          hint={`Use a ${session.network} address with an Orchard receiver and no transparent receiver.`}
        >
          <Input
            value={receiver}
            onChange={(event) => onReceiverChange(event.target.value)}
            name="recipient-destination"
            required
            minLength={20}
            maxLength={512}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            disabled={busy}
            className="font-mono"
          />
        </Field>
        <button
          type="submit"
          className="button button-dark mt-6 w-full"
          disabled={busy || receiver.trim().length < 20}
        >
          {busy ? "Confirming safely…" : "Confirm destination for review"}
        </button>
      </form>
    </div>
  );
}

function Confirmation() {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="glyph glyph-done" aria-hidden />
        <StateTag state="RECIPIENT_CONFIRMED" />
      </div>
      <h3 className="mt-5 text-2xl font-semibold tracking-tight">
        Your destination was recorded for finance review.
      </h3>
      <dl className="mt-6 divide-y rounded-xl border px-4">
        <ConfirmationFact label="Destination verification" value="UNVERIFIED" />
        <ConfirmationFact label="Address ownership proof" value="UNAVAILABLE" />
        <ConfirmationFact label="Payment status" value="NOT AUTHORIZED" />
      </dl>
      <p className="text-muted mt-5 text-sm leading-6">
        An independent finance reviewer must verify the destination. This did
        not approve, sign, broadcast or settle a payment. You can close this
        page.
      </p>
    </div>
  );
}

function ConfirmationFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-3">
      <dt className="text-muted text-xs font-medium">{label}</dt>
      <dd className="font-mono text-xs font-semibold">{value}</dd>
    </div>
  );
}

function Unavailable() {
  return (
    <div>
      <Notice tone="stop" title="This invitation cannot be used" live>
        It may be missing, expired, revoked or already consumed. No destination
        was changed and no payment action occurred.
      </Notice>
      <p className="text-muted mt-5 text-sm leading-6">
        Ask the company&apos;s finance contact to issue a new invitation. For
        your privacy, Obliq does not reveal which condition caused this
        response.
      </p>
    </div>
  );
}

function ServiceError() {
  return (
    <div>
      <Notice tone="stop" title="Recipient verification is unavailable" live>
        Obliq could not safely check the session. No invitation, destination or
        payment state should be inferred from this outage.
      </Notice>
      <p className="text-muted mt-5 text-sm leading-6">
        Wait a moment and reload this page. If the problem continues, contact
        the company&apos;s finance team without forwarding the invitation link.
      </p>
    </div>
  );
}
