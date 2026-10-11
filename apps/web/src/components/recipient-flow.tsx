"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Field, Input } from "@/components/finance-form";
import { Notice } from "@/components/notice";
import { Fact } from "@/components/record";
import {
  type ApiReply,
  type RecipientConfirmation,
  type RecipientSummary,
  abbreviateReceiver,
  attemptStorageKey,
  challengeOutcome,
  destinationOutcome,
  groupReceiver,
  isCompleteCode,
  maxCodeAttempts,
  minutesRemaining,
  networkLabel,
  networkNote,
  normalizeCode,
  readInvitationToken,
  readStoredAttempt,
  receiverProblem,
  receiverProblemMessage,
  summaryOutcome,
  unifiedAddressPrefix,
  verificationOutcome,
} from "@/lib/recipient-flow";

type Phase =
  | "starting"
  | "missing"
  | "entry"
  | "code"
  | "unreachable"
  | "address"
  | "review"
  | "confirmed"
  | "closed";
type Closed = "LINK" | "SESSION" | "CONFLICT";
type Busy = "code" | "verify" | "summary" | "submit" | null;
type Message = {
  tone: "done" | "hold" | "stop" | "info";
  title: string;
  body: string;
};

const resendWaitSeconds = 30;
const steps = ["Verify email", "Enter address", "Result"] as const;

function stepOf(phase: Phase) {
  if (phase === "address" || phase === "review") return 1;
  if (phase === "confirmed") return 2;
  return 0;
}

/**
 * One same-origin request. The invitation token travels only in a POST body,
 * and nothing about the request or its reply is logged.
 */
async function call(path: string, body?: unknown): Promise<ApiReply> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(path, {
      ...(body === undefined
        ? { method: "GET" }
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }),
      credentials: "same-origin",
      cache: "no-store",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      // A reply without JSON carries only its status.
    }
    return { kind: "response", status: response.status, body: parsed };
  } catch {
    return { kind: "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

export function RecipientFlow() {
  // The token lives in memory only: never in storage, markup or the URL.
  const token = useRef<string | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const started = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);

  const [phase, setPhase] = useState<Phase>("starting");
  const [tokenAvailable, setTokenAvailable] = useState(false);
  const [closed, setClosed] = useState<Closed>("LINK");
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [code, setCode] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [resendIn, setResendIn] = useState(0);
  const [summary, setSummary] = useState<RecipientSummary | null>(null);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const [seenBefore, setSeenBefore] = useState(false);
  const [receiver, setReceiver] = useState("");
  const [receiverError, setReceiverError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [confirmation, setConfirmation] =
    useState<RecipientConfirmation | null>(null);

  const go = useCallback((next: Phase, note: Message | null = null) => {
    setMessage(note);
    setPhase(next);
  }, []);

  const close = useCallback(
    (reason: Closed) => {
      setClosed(reason);
      go("closed");
    },
    [go],
  );

  const openAddressStep = useCallback(
    (next: RecipientSummary) => {
      let stored = null;
      try {
        stored = readStoredAttempt(
          window.sessionStorage.getItem(attemptStorageKey),
          next.invitationId,
        );
      } catch {
        // Storage can be unavailable. The key then lasts for this page only.
      }
      idempotencyKey.current ??=
        stored?.idempotencyKey ?? window.crypto.randomUUID();
      remember(
        next.invitationId,
        idempotencyKey.current,
        stored?.receiver ?? null,
        stored?.state ?? "UNSENT",
      );
      const recovering = Boolean(stored?.receiver);
      setSeenBefore(recovering);
      setReceiver(stored?.receiver ?? "");
      setUncertain(recovering);
      setChecked(false);
      setSummary(next);
      setMinutesLeft(minutesRemaining(next.sessionExpiresAt, new Date()));
      go(
        recovering ? "review" : "address",
        recovering
          ? {
              tone: "hold",
              title: "Recover the earlier submission",
              body: "This browser kept the exact address and retry key from an interrupted or completed request. Retry only this address so Obliq can return the authoritative result. You cannot replace it from this link.",
            }
          : null,
      );
    },
    [go],
  );

  const loadSummary = useCallback(
    async (afterVerification: boolean) => {
      setBusy("summary");
      const outcome = summaryOutcome(
        await call("/api/private-payables/session"),
      );
      setBusy(null);
      if (outcome.kind === "SUMMARY") return openAddressStep(outcome.summary);
      if (outcome.kind === "NO_SESSION") {
        if (afterVerification) return close("LINK");
        return go(token.current ? "entry" : "missing");
      }
      // The service did not answer. A person holding a link can still start;
      // one who may already be verified is offered another try.
      if (token.current && !afterVerification) return go("entry");
      go("unreachable");
    },
    [close, go, openAddressStep],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    token.current = readInvitationToken(window.location.hash);
    setTokenAvailable(token.current !== null);
    // Drop the fragment, and any query string, from the address bar and from
    // this history entry so the token cannot be copied, bookmarked or synced.
    if (window.location.hash || window.location.search)
      window.history.replaceState(null, "", window.location.pathname);
    void loadSummary(false);
  }, [loadSummary]);

  // Move focus to the new step's heading so it is announced.
  useEffect(() => {
    if (phase !== "starting") heading.current?.focus();
  }, [phase, closed]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1_000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  // The verified session is short. When it ends, say so instead of letting
  // a submission fail without explanation.
  const sessionOpen = phase === "address" || phase === "review";
  useEffect(() => {
    if (!summary || !sessionOpen) return;
    const tick = () => {
      const left = minutesRemaining(summary.sessionExpiresAt, new Date());
      setMinutesLeft(left);
      if (left === 0 && busy !== "submit") close("SESSION");
    };
    const timer = setInterval(tick, 15_000);
    return () => clearInterval(timer);
  }, [summary, sessionOpen, busy, close]);

  async function requestCode(resend: boolean) {
    if (!token.current || busy) return;
    setBusy("code");
    setMessage(null);
    const outcome = challengeOutcome(
      await call("/api/private-payables/challenges", {
        invitationToken: token.current,
      }),
    );
    setBusy(null);
    if (outcome === "UNREACHABLE")
      return setMessage({
        tone: "stop",
        title: "The request did not go through",
        body: "Obliq could not be reached, so no code was requested. Check your connection and try again.",
      });
    setCode("");
    setAttempts(0);
    setResendIn(resendWaitSeconds);
    go(
      "code",
      resend
        ? {
            tone: "info",
            title: "A new code was requested",
            body: "If this link is still valid, a new code is on its way. The earlier code no longer works.",
          }
        : null,
    );
  }

  async function verifyCode() {
    if (!token.current || busy) return;
    if (!isCompleteCode(code))
      return setMessage({
        tone: "stop",
        title: "Enter all six digits",
        body: "The code in the email is six digits long.",
      });
    setBusy("verify");
    setMessage(null);
    const outcome = verificationOutcome(
      await call("/api/private-payables/verify-contact", {
        invitationToken: token.current,
        code,
      }),
    );
    setBusy(null);
    if (outcome === "VERIFIED") {
      // Keep the token in memory only until this one-time workflow finishes so
      // an expired 30-minute session can repeat the email check while the
      // 24-hour invitation is still eligible.
      setCode("");
      return loadSummary(true);
    }
    if (outcome === "UNCERTAIN") {
      // The check may have succeeded with the reply lost on the way back.
      const session = summaryOutcome(
        await call("/api/private-payables/session"),
      );
      if (session.kind === "SUMMARY") {
        setCode("");
        return openAddressStep(session.summary);
      }
      return setMessage({
        tone: "hold",
        title: "We could not tell whether the code was checked",
        body: "Obliq did not answer. Try the same code again. If it is then refused, request a new code.",
      });
    }
    const used = attempts + 1;
    setAttempts(used);
    setCode("");
    setMessage(
      used >= maxCodeAttempts
        ? {
            tone: "stop",
            title: "This code can no longer be used",
            body: `A code stops working after ${maxCodeAttempts} wrong attempts. Request a new one below.`,
          }
        : {
            tone: "stop",
            title: "That code was not accepted",
            body: "It may be mistyped, more than 10 minutes old or replaced by a newer code, or this link may no longer be valid. For your privacy we do not say which. Check the latest email, or request a new code.",
          },
    );
  }

  function reviewAddress() {
    if (!summary) return;
    const problem = receiverProblem(receiver, summary.network);
    if (problem) {
      setReceiverError(receiverProblemMessage(problem, summary.network));
      return;
    }
    setReceiverError(null);
    setChecked(false);
    setUncertain(false);
    go("review");
  }

  async function submitAddress() {
    if (!summary || !idempotencyKey.current || busy || !checked) return;
    const submittedReceiver = receiver.trim();
    // Persist the exact receiver/key pair before the network request. A reload
    // or lost response can therefore retry only this operation, never bind the
    // same key to a different destination.
    remember(
      summary.invitationId,
      idempotencyKey.current,
      submittedReceiver,
      "PENDING",
    );
    setUncertain(true);
    setBusy("submit");
    setMessage(null);
    // The same key goes with every attempt, so a repeat after a lost reply
    // returns the first result and can never record a second address.
    const outcome = destinationOutcome(
      await call("/api/private-payables/destination", {
        receiver: submittedReceiver,
        idempotencyKey: idempotencyKey.current,
      }),
    );
    setBusy(null);
    if (outcome.kind === "CONFIRMED") {
      token.current = null;
      setTokenAvailable(false);
      remember(
        summary.invitationId,
        idempotencyKey.current,
        submittedReceiver,
        "CONFIRMED",
      );
      setConfirmation(outcome.confirmation);
      return go("confirmed");
    }
    if (outcome.kind === "INVALID") {
      // A 422 is emitted only for a structured rejection from the sidecar,
      // before the database operation. It is therefore safe to start a new
      // attempt with a new key and let the recipient edit the address.
      idempotencyKey.current = window.crypto.randomUUID();
      remember(summary.invitationId, idempotencyKey.current, null, "UNSENT");
      setUncertain(false);
      setSeenBefore(false);
      setChecked(false);
      setReceiverError(
        `This is not an Orchard-capable shielded Unified Address for ${networkLabel(summary.network)}, or it contains a transparent receiver. Copy a new address from your wallet.`,
      );
      return go("address");
    }
    if (outcome.kind === "CONFLICT") return close("CONFLICT");
    if (outcome.kind === "CLOSED")
      return close(
        minutesRemaining(summary.sessionExpiresAt, new Date()) === 0
          ? "SESSION"
          : "LINK",
      );
    setUncertain(true);
    setMessage({
      tone: "hold",
      title: "We do not know whether your address was recorded",
      body: "Obliq did not return an authoritative result. The exact address and retry key are locked together in this browser tab. Retry this same address; do not submit another destination while the outcome is unresolved.",
    });
  }

  const formId = useId();
  const network = summary?.network;

  return (
    <div>
      <ol className="flow-steps" aria-label="Progress">
        {steps.map((label, index) => {
          const current = stepOf(phase);
          const state =
            index < current ? "done" : index === current ? "current" : "todo";
          return (
            <li
              key={label}
              data-state={state}
              aria-current={state === "current" ? "step" : undefined}
            >
              <span className="flow-step-mark" aria-hidden>
                {index + 1}
              </span>
              <span>
                {label}
                {state === "done" && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          );
        })}
      </ol>

      <section className="card mt-5 p-5 sm:p-8" aria-busy={busy !== null}>
        {phase === "starting" && (
          <div aria-live="polite">
            <div className="animate-pulse motion-reduce:animate-none">
              <div className="h-7 w-2/3 rounded bg-stone-200" />
              <div className="mt-4 h-4 w-full rounded bg-stone-200" />
              <div className="mt-2 h-4 w-5/6 rounded bg-stone-200" />
              <div className="mt-6 h-11 w-44 rounded-lg bg-stone-200" />
            </div>
            <span className="sr-only">Checking your link</span>
          </div>
        )}

        {phase === "missing" && (
          <>
            <Heading ref={heading}>Open the link from your email</Heading>
            <p className="text-muted mt-3">
              This page works only when it is opened from the invitation link in
              the email you received. The access is carried by the link itself,
              so there is nothing to look up or sign in to here.
            </p>
            <p className="text-muted mt-3">
              If you did come from that email, the link may have been cut short.
              Copy the whole link into your browser, or ask the person who is
              paying you to send a new one.
            </p>
            <p className="text-muted mt-3">
              If you reloaded this page, open the link in the email again. For
              your security the link&rsquo;s key is removed from the address bar
              as soon as the page opens.
            </p>
          </>
        )}

        {phase === "entry" && (
          <>
            <Heading ref={heading}>Confirm where you want to be paid</Heading>
            <p className="text-muted mt-3">
              Someone who owes you a payment has asked you to provide a Zcash
              address through Obliq. Before anything about that payment is
              shown, we need to check that you can read the email this link was
              sent to.
            </p>
            {message && <FlowNotice message={message} />}
            <button
              type="button"
              className="button button-dark mt-6"
              onClick={() => void requestCode(false)}
              disabled={busy !== null}
              aria-busy={busy === "code" || undefined}
            >
              {busy === "code" ? "Requesting…" : "Email me a code"}
            </button>
            <p className="text-ink-3 mt-5 text-xs leading-5">
              Keep this tab open until you finish. The link&rsquo;s key has been
              removed from the address bar, so reloading means opening the email
              link again.
            </p>
          </>
        )}

        {phase === "code" && (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void verifyCode();
            }}
          >
            <Heading ref={heading}>Enter the code we emailed</Heading>
            <p className="text-muted mt-3">
              If this link is still valid, a 6-digit code was sent to the email
              address the payer has on record for you. It works for 10 minutes.
              We cannot show that address here.
            </p>
            {message && <FlowNotice message={message} />}
            <div className="mt-6 max-w-xs">
              <Field label="6-digit code">
                <Input
                  name="code"
                  value={code}
                  onChange={(event) =>
                    setCode(normalizeCode(event.target.value))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  disabled={busy !== null || attempts >= maxCodeAttempts}
                  className="code-input"
                  aria-describedby={`${formId}-code-hint`}
                />
              </Field>
              <p
                id={`${formId}-code-hint`}
                className="text-ink-3 mt-2 text-xs leading-5"
              >
                A code stops working after {maxCodeAttempts} wrong attempts.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                className="button button-dark"
                disabled={busy !== null || attempts >= maxCodeAttempts}
                aria-busy={busy === "verify" || undefined}
              >
                {busy === "verify" ? "Checking…" : "Verify email"}
              </button>
              <button
                type="button"
                className="button button-light"
                onClick={() => void requestCode(true)}
                disabled={busy !== null || resendIn > 0}
                aria-busy={busy === "code" || undefined}
              >
                {busy === "code"
                  ? "Requesting…"
                  : resendIn > 0
                    ? `Send a new code in ${resendIn}s`
                    : "Send a new code"}
              </button>
            </div>
            <p className="text-ink-3 mt-5 text-xs leading-5">
              Nothing arrived? Check your spam folder. If several codes were
              requested in the last hour, or the link has expired or been
              cancelled, no email is sent. In that case ask the person who is
              paying you for a new link.
            </p>
          </form>
        )}

        {phase === "unreachable" && (
          <>
            <Heading ref={heading}>We could not load your details</Heading>
            <p className="text-muted mt-3">
              Obliq did not answer, so nothing is shown and nothing was changed.
              Your verification, if you completed it, is still valid until its
              30 minutes run out.
            </p>
            <button
              type="button"
              className="button button-dark mt-6"
              onClick={() => void loadSummary(false)}
              disabled={busy !== null}
              aria-busy={busy === "summary" || undefined}
            >
              {busy === "summary" ? "Trying…" : "Try again"}
            </button>
          </>
        )}

        {(phase === "address" || phase === "review") && summary && network && (
          <>
            <Heading ref={heading}>
              {phase === "address"
                ? "Enter your Zcash address"
                : "Check the address before you submit it"}
            </Heading>
            <p className="text-muted mt-3">
              Your email is verified for this link.{" "}
              {minutesLeft !== null && (
                <span className="text-ink font-semibold">
                  {minutesLeft > 1
                    ? `About ${minutesLeft} minutes remain to finish.`
                    : "Less than a minute remains to finish."}
                </span>
              )}
            </p>

            <div
              className="summary mt-6 grid-cols-1"
              role="group"
              aria-label="The payment in question"
            >
              <div>
                <p className="fact-label">Amount owed to you</p>
                <p className="figure mt-2">{summary.amount}</p>
              </div>
              <dl className="grid gap-4 sm:grid-cols-3">
                <Fact label="Reference">{summary.reference}</Fact>
                <Fact label="Due">
                  {summary.dueAt
                    ? summary.dueAt.toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })
                    : "Not set"}
                </Fact>
                <Fact label="Network">{networkLabel(network)}</Fact>
              </dl>
            </div>
            <p className="text-ink-3 mt-3 text-xs leading-5">
              This is everything this link shows. It gives no access to the
              payer&rsquo;s account or to any other record.
              {networkNote(network) && ` ${networkNote(network)}`}
            </p>

            {phase === "address" && (
              <form
                noValidate
                className="mt-7"
                onSubmit={(event) => {
                  event.preventDefault();
                  reviewAddress();
                }}
              >
                {seenBefore && (
                  <Notice
                    tone="info"
                    title="An address was already submitted from this browser"
                    className="mb-5"
                  >
                    Enter the same address again to see the recorded result. A
                    different address will not replace it.
                  </Notice>
                )}
                <label
                  htmlFor={`${formId}-receiver`}
                  className="block text-[0.8125rem] font-bold"
                >
                  Your shielded Unified Address
                </label>
                <textarea
                  id={`${formId}-receiver`}
                  name="receiver"
                  value={receiver}
                  onChange={(event) => {
                    setReceiver(event.target.value);
                    if (receiverError) setReceiverError(null);
                  }}
                  rows={4}
                  maxLength={600}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={receiverError ? true : undefined}
                  aria-describedby={`${formId}-receiver-hint${receiverError ? ` ${formId}-receiver-error` : ""}`}
                  className="address-input mt-2"
                />
                {receiverError && (
                  <p
                    id={`${formId}-receiver-error`}
                    role="alert"
                    className="text-stop mt-2 text-sm font-semibold"
                  >
                    {receiverError}
                  </p>
                )}
                <p
                  id={`${formId}-receiver-hint`}
                  className="text-ink-3 mt-2 text-xs leading-5"
                >
                  Copy it from your own wallet. On {networkLabel(network)} it
                  starts with{" "}
                  <code className="font-semibold">
                    {unifiedAddressPrefix(network)}
                  </code>
                  . It must include a shielded Orchard receiver and no
                  transparent receiver.
                </p>
                <button type="submit" className="button button-dark mt-6">
                  Review address
                </button>
              </form>
            )}

            {phase === "review" && (
              <form
                noValidate
                className="mt-7"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitAddress();
                }}
              >
                <p className="fact-label">Address you entered</p>
                <p
                  className="address-block mt-2"
                  aria-label={`Address beginning ${receiver.trim().slice(0, 12)} and ending ${receiver.trim().slice(-12)}`}
                >
                  {groupReceiver(receiver).map((group, index) => (
                    <span key={index}>{group}</span>
                  ))}
                </p>
                <p className="text-ink-3 mt-2 text-xs leading-5">
                  {receiver.trim().length} characters · begins{" "}
                  <code>{receiver.trim().slice(0, 12)}</code> · ends{" "}
                  <code>{receiver.trim().slice(-12)}</code>
                </p>
                <Notice
                  tone="hold"
                  title="Compare it with your wallet, character by character"
                  className="mt-5"
                >
                  A payment sent to a wrong address cannot be recalled. Obliq
                  checks that the address is well formed. It does not check who
                  controls it.
                </Notice>
                {message && <FlowNotice message={message} />}
                <label className="mt-5 flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 flex-none"
                    checked={checked}
                    onChange={(event) => setChecked(event.target.checked)}
                    disabled={busy !== null}
                  />
                  <span>
                    I compared this address with my wallet and it is the one I
                    want the payer to review.
                  </span>
                </label>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    className="button button-dark"
                    disabled={!checked || busy !== null}
                    aria-busy={busy === "submit" || undefined}
                  >
                    {busy === "submit"
                      ? "Submitting…"
                      : uncertain
                        ? "Try again"
                        : "Submit address for review"}
                  </button>
                  {!uncertain && (
                    <button
                      type="button"
                      className="button button-light"
                      onClick={() => go("address")}
                      disabled={busy !== null}
                    >
                      Edit address
                    </button>
                  )}
                </div>
                <p className="text-ink-3 mt-5 text-xs leading-5">
                  Submitting sends the address to the payer for review. It does
                  not approve, sign or send a payment, and this link can be used
                  once.
                </p>
              </form>
            )}
          </>
        )}

        {phase === "confirmed" && confirmation && summary && (
          <>
            <Heading ref={heading}>
              Address submitted. Not yet verified.
            </Heading>
            {confirmation.recovered && (
              <Notice
                tone="info"
                title="This is the result of your earlier submission"
                live
                className="mt-5"
              >
                Nothing new was recorded just now.
              </Notice>
            )}
            <p className="text-muted mt-3">
              Your address for{" "}
              <strong className="text-ink">{summary.reference}</strong> was
              recorded and sent to the payer for review.
            </p>
            <dl className="mt-6 grid gap-5 sm:grid-cols-2">
              <Fact label="Status">
                <span className="tag tag-hold">
                  <span className="glyph glyph-wait" aria-hidden />
                  Unverified
                </span>
              </Fact>
              <Fact label="Recorded as">
                Destination version {confirmation.destinationVersion}
              </Fact>
              <Fact label="Address" mono>
                {abbreviateReceiver(receiver)}
              </Fact>
              <Fact label="Network">{networkLabel(summary.network)}</Fact>
            </dl>
            <h3 className="mt-8 text-sm font-bold">What happens next</h3>
            <ol className="text-muted mt-3 list-decimal space-y-2 pl-5 text-sm">
              <li>
                Someone on the payer&rsquo;s finance team, other than the person
                who sent you this link, reviews the address separately. They may
                contact you another way to check it.
              </li>
              <li>
                Until that review, the address cannot be used for payment.
              </li>
              <li>
                Any payment is approved, signed and sent by the payer under
                their own controls. Submitting an address does not approve,
                schedule or guarantee one.
              </li>
            </ol>
            <h3 className="mt-8 text-sm font-bold">What was checked</h3>
            <ul className="text-muted mt-3 space-y-2 text-sm">
              <li className="flex gap-3">
                <span
                  className="glyph glyph-done text-clear mt-1.5"
                  aria-hidden
                />
                <span>
                  <strong className="text-ink">Email access.</strong> Someone
                  who could read the email this link was sent to submitted the
                  address.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="glyph glyph-unknown mt-1.5" aria-hidden />
                <span>
                  <strong className="text-ink">
                    Wallet ownership was not checked.
                  </strong>{" "}
                  Obliq did not verify that you, or anyone, controls this
                  address. Verifying an email is not proof of that.
                </span>
              </li>
            </ul>
            <p className="text-ink-3 mt-8 text-xs leading-5">
              You can close this page. This link cannot be used again. If the
              address is wrong, tell the person who is paying you and ask for a
              new link.
            </p>
          </>
        )}

        {phase === "closed" && (
          <>
            {closed === "LINK" && (
              <>
                <Heading ref={heading}>This link cannot be used</Heading>
                <p className="text-muted mt-3">
                  It may have expired, been cancelled or replaced by the sender,
                  or already been used. Links last 24 hours and work once. For
                  your privacy we do not say which applies.
                </p>
                <p className="text-muted mt-3">
                  Nothing was changed. Ask the person who is paying you to send
                  a new link.
                </p>
              </>
            )}
            {closed === "SESSION" && (
              <>
                <Heading ref={heading}>Your verified session has ended</Heading>
                <p className="text-muted mt-3">
                  For your security a verified session lasts 30 minutes. No
                  address was submitted.
                </p>
                <p className="text-muted mt-3">
                  If the original 24-hour invitation is still open, you can
                  repeat the email check. The earlier session and code will no
                  longer work.
                </p>
                {tokenAvailable ? (
                  <button
                    type="button"
                    className="button button-dark mt-6"
                    onClick={() => void requestCode(true)}
                    disabled={busy !== null}
                    aria-busy={busy === "code" || undefined}
                  >
                    {busy === "code" ? "Requesting…" : "Email me a new code"}
                  </button>
                ) : (
                  <p className="text-muted mt-3">
                    Reopen the original invitation from your email, or ask the
                    payer to send a new one.
                  </p>
                )}
              </>
            )}
            {closed === "CONFLICT" && (
              <>
                <Heading ref={heading}>
                  An address was already submitted from this link
                </Heading>
                <p className="text-muted mt-3">
                  It is different from the one you just entered. The first
                  address stands and nothing was changed.
                </p>
                <p className="text-muted mt-3">
                  If the first address was wrong, tell the person who is paying
                  you and ask for a new link.
                </p>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Heading({
  ref,
  children,
}: {
  ref: React.Ref<HTMLHeadingElement>;
  children: React.ReactNode;
}) {
  return (
    <h2
      ref={ref}
      tabIndex={-1}
      className="font-display text-2xl leading-tight font-semibold tracking-tight outline-none sm:text-[1.75rem]"
    >
      {children}
    </h2>
  );
}

function FlowNotice({ message }: { message: Message }) {
  return (
    <Notice tone={message.tone} title={message.title} live className="mt-5">
      {message.body}
    </Notice>
  );
}

function remember(
  invitationId: string,
  key: string,
  receiver: string | null,
  state: "UNSENT" | "PENDING" | "CONFIRMED",
) {
  try {
    window.sessionStorage.setItem(
      attemptStorageKey,
      JSON.stringify({ invitationId, idempotencyKey: key, receiver, state }),
    );
  } catch {
    // Without storage the key is kept in memory for this page only.
  }
}
