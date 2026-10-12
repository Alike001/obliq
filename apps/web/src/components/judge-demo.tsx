"use client";

import {
  Check,
  CircleAlert,
  LockKeyhole,
  RotateCcw,
  UserRoundCheck,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  evaluateDemoPolicy,
  initialDemoApprovalCounts,
  initialDemoInputs,
  type DemoApprovalCounts,
  type DemoInputs,
} from "@/lib/demo-policy";
import { Field, Input, Select } from "./finance-form";

const outcomeTone = {
  PASS: "bg-clear-bg text-clear",
  BLOCK: "bg-stop-bg text-stop",
  REQUIRE_APPROVAL: "bg-hold-bg text-hold",
} as const;

const lifecycle = [
  ["CAPTURE", "Sample invoice loaded"],
  ["CONTROL", "Policy and approvals"],
  ["SETTLE", "External signer required"],
  ["RECONCILE", "Read-only observer required"],
  ["PROVE", "Settled record required"],
] as const;

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <label className="card flex min-h-20 cursor-pointer items-start gap-3 p-4 has-disabled:cursor-not-allowed has-disabled:opacity-55">
      <input
        type="checkbox"
        className="mt-1 size-4 accent-[#8a5a00]"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="text-muted mt-1 block text-xs leading-5">
          {description}
        </span>
      </span>
    </label>
  );
}

export function JudgeDemo() {
  const [inputs, setInputs] = useState<DemoInputs>(initialDemoInputs);
  const [approvals, setApprovals] = useState<DemoApprovalCounts>(
    initialDemoApprovalCounts,
  );
  const [changeNotice, setChangeNotice] = useState(
    "No sandbox changes have been made yet.",
  );

  const evaluation = useMemo(() => {
    try {
      return { result: evaluateDemoPolicy(inputs, approvals), error: null };
    } catch (error) {
      return {
        result: null,
        error:
          error instanceof Error
            ? error.message
            : "The amount could not be evaluated.",
      };
    }
  }, [inputs, approvals]);

  function changeInputs(
    patch: Partial<DemoInputs>,
    reason = "A material input changed. Illustrative approvals were reset.",
  ) {
    setInputs((current) => {
      const next = { ...current, ...patch };
      if (patch.recipientConfirmed === false) next.destinationReviewed = false;
      return next;
    });
    setApprovals(initialDemoApprovalCounts);
    setChangeNotice(reason);
  }

  function reset() {
    setInputs(initialDemoInputs);
    setApprovals(initialDemoApprovalCounts);
    setChangeNotice("Sandbox reset to its fictional starting record.");
  }

  const result = evaluation.result;
  const ready = result?.readiness.ready ?? false;

  return (
    <div className="space-y-10">
      <section
        className="grid gap-6 lg:grid-cols-[minmax(0,.82fr)_minmax(0,1.18fr)]"
        aria-labelledby="demo-record-heading"
      >
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Fictional payable</p>
              <h2 id="demo-record-heading" className="t-section mt-3 text-2xl!">
                Northstar Studio · INV-1048
              </h2>
            </div>
            <button
              className="button button-light"
              type="button"
              onClick={reset}
            >
              <RotateCcw size={15} aria-hidden /> Reset
            </button>
          </div>
          <dl className="sheet divide-line mt-5 divide-y text-sm">
            <div className="flex justify-between gap-5 p-4">
              <dt className="text-muted">Organization</dt>
              <dd className="font-medium">Aster Works (fictional)</dd>
            </div>
            <div className="flex justify-between gap-5 p-4">
              <dt className="text-muted">Purpose</dt>
              <dd className="text-right font-medium">
                October design services
              </dd>
            </div>
            <div className="flex justify-between gap-5 p-4">
              <dt className="text-muted">Due</dt>
              <dd className="font-medium">October 28, 2026</dd>
            </div>
            <div className="flex justify-between gap-5 p-4">
              <dt className="text-muted">Source</dt>
              <dd className="font-medium">Demo invoice fixture</dd>
            </div>
          </dl>
          <p className="text-muted mt-3 text-xs leading-5">
            This record exists only in this browser tab. It is not stored,
            emailed, approved, or submitted to an Obliq service.
          </p>
        </div>

        <fieldset className="sheet p-5 md:p-6">
          <legend className="px-2 text-sm font-semibold">
            Change control inputs
          </legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Invoice amount (USD)"
              hint="Exact decimal parsing; no floating point."
            >
              <Input
                inputMode="decimal"
                value={inputs.amount}
                aria-invalid={Boolean(evaluation.error)}
                aria-describedby="demo-amount-error"
                onChange={(event) =>
                  changeInputs({ amount: event.target.value })
                }
              />
            </Field>
            <Field label="Duplicate finding">
              <Select
                value={inputs.duplicateStatus}
                onChange={(event) =>
                  changeInputs({
                    duplicateStatus: event.target
                      .value as DemoInputs["duplicateStatus"],
                  })
                }
              >
                <option value="CLEAR">No unresolved duplicate</option>
                <option value="POSSIBLE_OPEN">Possible duplicate — open</option>
                <option value="EXACT_OPEN">Exact duplicate — open</option>
              </Select>
            </Field>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Toggle
              checked={inputs.vendorKnown}
              onChange={(vendorKnown) => changeInputs({ vendorKnown })}
              label="Known vendor"
              description="Turn off to see first-payment Treasury review."
            />
            <Toggle
              checked={inputs.fieldsComplete}
              onChange={(fieldsComplete) => changeInputs({ fieldsComplete })}
              label="Required fields complete"
              description="Missing financial information blocks controls."
            />
            <Toggle
              checked={inputs.recipientConfirmed}
              onChange={(recipientConfirmed) =>
                changeInputs(
                  { recipientConfirmed },
                  "Destination assurance changed. Illustrative approvals were reset.",
                )
              }
              label="Recipient contact confirmed a destination"
              description="Illustrative only: no email or wallet ownership check occurs."
            />
            <Toggle
              checked={inputs.destinationReviewed}
              disabled={!inputs.recipientConfirmed}
              onChange={(destinationReviewed) =>
                changeInputs(
                  { destinationReviewed },
                  "Independent destination review changed. Illustrative approvals were reset.",
                )
              }
              label="Independent finance review recorded"
              description="Models a different authorized reviewer; this click is not a real review."
            />
          </div>
          <p
            id="demo-amount-error"
            className={evaluation.error ? "text-stop mt-4 text-sm" : "sr-only"}
            role={evaluation.error ? "alert" : undefined}
          >
            {evaluation.error ?? "Amount is valid."}
          </p>
          <p className="text-muted mt-4 text-xs leading-5" aria-live="polite">
            {changeNotice}
          </p>
        </fieldset>
      </section>

      <section aria-labelledby="control-results-heading">
        <div className="section-intro mb-5!">
          <div>
            <p className="eyebrow">Actual deterministic engine</p>
            <h2 id="control-results-heading" className="t-title mt-3 text-3xl!">
              Control decision
            </h2>
          </div>
          <p className="t-small">
            Calculated in your browser by the same @obliq/policy functions used
            by the persisted product. The sandbox does not call an API.
          </p>
        </div>

        {result ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,.85fr)]">
            <div className="sheet overflow-hidden">
              <div className="sheet-head">
                <div>
                  <p className="fact-label">Policy decision</p>
                  <p className="mt-1 text-lg font-semibold">
                    {result.decision.result.replaceAll("_", " ")}
                  </p>
                </div>
                <p className="font-mono text-sm font-semibold">
                  {result.formattedAmount}
                </p>
              </div>
              <ul className="divide-line divide-y">
                {result.decision.findings.map((finding) => (
                  <li
                    key={finding.code}
                    className="flex items-start gap-3 p-4 md:px-6"
                  >
                    <span
                      className={`mt-0.5 rounded px-2 py-1 text-[0.625rem] font-bold tracking-wider ${outcomeTone[finding.outcome]}`}
                    >
                      {finding.outcome.replace("_", " ")}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">
                        {finding.message}
                      </span>
                      <code className="text-muted mt-1 block text-[0.6875rem] break-all">
                        {finding.code}
                      </code>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="sheet p-5 md:p-6">
              <p className="fact-label">Illustrative approval counters</p>
              <h3 className="mt-2 text-lg font-semibold">
                Requirements derived from policy
              </h3>
              <p className="text-muted mt-2 text-sm leading-6">
                These buttons do not identify or authorize a person. They only
                let you test how current requirements affect readiness.
              </p>
              {result.requirements.length ? (
                <ul className="mt-5 space-y-4">
                  {result.requirements.map((requirement) => {
                    const complete =
                      requirement.approvedCount >= requirement.count;
                    return (
                      <li key={requirement.role} className="card p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-semibold">{requirement.role}</p>
                            <p className="text-muted mt-1 text-xs leading-5">
                              {requirement.reason}
                              {requirement.prohibitCreator
                                ? " · creator cannot satisfy this requirement"
                                : ""}
                            </p>
                          </div>
                          <span className="font-mono text-xs font-semibold">
                            {requirement.approvedCount}/{requirement.count}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="button button-light mt-3 w-full"
                          disabled={
                            complete || result.decision.result === "BLOCKED"
                          }
                          onClick={() => {
                            setApprovals((current) => ({
                              ...current,
                              [requirement.role]:
                                (current[requirement.role] ?? 0) + 1,
                            }));
                            setChangeNotice(
                              "An illustrative approval counter changed. No identity or approval was recorded.",
                            );
                          }}
                        >
                          {complete ? (
                            <Check size={15} aria-hidden />
                          ) : (
                            <UserRoundCheck size={15} aria-hidden />
                          )}
                          {complete
                            ? "Threshold shown as met"
                            : "Add illustrative approval"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-muted mt-5 text-sm">
                  Correct the blocking amount or currency before requirements
                  can be shown.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="notice notice-stop" role="alert">
            <span className="glyph glyph-stop" aria-hidden />
            <div>
              <strong>Policy evaluation stopped</strong>
              <p>{evaluation.error}</p>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="readiness-heading">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)]">
          <div
            className={`notice ${ready ? "notice-clear" : "notice-hold"} items-start!`}
            role="status"
            aria-live="polite"
          >
            <span
              className={ready ? "glyph glyph-done" : "glyph glyph-attn"}
              aria-hidden
            />
            <div>
              <strong id="readiness-heading">
                {ready ? "Ready to settle" : "Not ready to settle"}
              </strong>
              <p>
                {ready
                  ? "The real readiness function finds no unresolved reason for this browser-only scenario. No settlement intent or payment was created."
                  : "The real readiness function explains what remains before this scenario could reach settlement preparation."}
              </p>
            </div>
          </div>
          <div className="sheet p-5 md:p-6">
            <p className="fact-label">Structured readiness reasons</p>
            {result?.readiness.reasons.length ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {result.readiness.reasons.map((reason) => (
                  <li key={reason.code} className="card p-4">
                    <p className="text-sm font-semibold">{reason.message}</p>
                    <code className="text-muted mt-2 block text-[0.6875rem] break-all">
                      {reason.code}
                    </code>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mt-3 text-sm leading-6">
                No readiness blockers in this calculation. The sandbox stops
                here because signing is a separate external authority.
              </p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="lifecycle-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Explore the boundary</p>
            <h2 id="lifecycle-heading" className="t-title mt-3 text-3xl!">
              Payment lifecycle
            </h2>
          </div>
          <span className="cap cap-hatched">Sandbox · browser only</span>
        </div>
        <ol className="mt-6 grid gap-3 md:grid-cols-5">
          {lifecycle.map(([name, description], index) => {
            const active =
              index === 0 ||
              (index === 1 && Boolean(result)) ||
              (index === 2 && ready);
            return (
              <li
                key={name}
                className={`card relative min-h-36 p-4 ${active ? "border-gold-deep!" : "bg-sunken!"}`}
              >
                <span className="font-mono text-xs font-semibold">
                  0{index + 1}
                </span>
                <h3 className="mt-5 font-semibold">{name}</h3>
                <p className="text-muted mt-2 text-xs leading-5">
                  {active ? description : "Not performed in this sandbox"}
                </p>
                {index >= 2 && (
                  <LockKeyhole
                    size={16}
                    className="text-muted absolute top-4 right-4"
                    aria-label="Unavailable in sandbox"
                  />
                )}
              </li>
            );
          })}
        </ol>
        <div className="notice notice-hatched mt-5" role="note">
          <CircleAlert className="glyph" aria-hidden />
          <div>
            <strong>The sandbox never creates a payment success state</strong>
            <p>
              It does not persist an obligation, verify a person or wallet,
              create an intent, contact a signer, broadcast, scan Zcash, or
              issue evidence. The separate historical section below is the only
              settlement evidence on this page.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
