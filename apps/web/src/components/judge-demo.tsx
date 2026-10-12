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
  demoScenarios,
  evaluateDemoPolicy,
  initialDemoApprovalCounts,
  initialDemoInputs,
  type DemoApprovalCounts,
  type DemoInputs,
  type DemoScenarioId,
} from "@/lib/demo-policy";
import { Field, Input, Select } from "./finance-form";

const outcomeTone = {
  PASS: "bg-clear-bg text-clear",
  BLOCK: "bg-stop-bg text-stop",
  REQUIRE_APPROVAL: "bg-hold-bg text-hold",
} as const;

const lifecycle = [
  ["CAPTURE", "Fictional invoice loaded"],
  ["CONTROL", "Calculated here"],
  ["SETTLE", "External authority"],
  ["RECONCILE", "Read-only observer"],
  ["PROVE", "Settled record"],
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
  const [activeScenario, setActiveScenario] = useState<DemoScenarioId | null>(
    "NEW_VENDOR",
  );
  const [inputs, setInputs] = useState<DemoInputs>(initialDemoInputs);
  const [approvals, setApprovals] = useState<DemoApprovalCounts>(
    initialDemoApprovalCounts,
  );
  const [changeNotice, setChangeNotice] = useState(
    "Start by resolving the highlighted control.",
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
    reason = "A material input changed. Browser-only approval counters were reset.",
  ) {
    setInputs((current) => {
      const next = { ...current, ...patch };
      if (patch.recipientConfirmed === false) next.destinationReviewed = false;
      return next;
    });
    setActiveScenario(null);
    setApprovals(initialDemoApprovalCounts);
    setChangeNotice(reason);
  }

  function selectScenario(id: DemoScenarioId) {
    const scenario = demoScenarios.find((item) => item.id === id);
    if (!scenario) return;
    setActiveScenario(id);
    setInputs({ ...scenario.inputs });
    setApprovals(initialDemoApprovalCounts);
    setChangeNotice(
      `${scenario.label} loaded. No approval, record, or payment was created.`,
    );
  }

  function reset() {
    selectScenario("NEW_VENDOR");
    setChangeNotice("Sandbox reset to the fictional new-vendor scenario.");
  }

  const result = evaluation.result;
  const ready = result?.readiness.ready ?? false;
  const blockers = result?.decision.findings.filter(
    (finding) => finding.outcome === "BLOCK",
  );
  const nextAction = evaluation.error
    ? "Enter a valid non-negative USD amount with no more than two decimals."
    : !inputs.fieldsComplete
      ? "Complete the required financial fields."
      : inputs.duplicateStatus !== "CLEAR"
        ? "Resolve the duplicate finding before authorization."
        : !inputs.recipientConfirmed
          ? "Obtain recipient contact confirmation of a destination."
          : !inputs.destinationReviewed
            ? "Have a different finance operator review the destination."
            : ready
              ? "Stop here. A persisted product would prepare a settlement intent next."
              : "Satisfy the policy-derived human approval requirements below.";

  return (
    <div className="space-y-14">
      <section aria-labelledby="demo-record-heading">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,.85fr)]">
          <div className="sheet p-5 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Step 1 · Review the payable</p>
                <h2 id="demo-record-heading" className="t-title mt-3 text-3xl!">
                  Northstar Studio
                </h2>
                <p className="text-muted mt-2 text-sm">
                  INV-1048 · October design services · due October 28
                </p>
              </div>
              <p className="font-mono text-2xl font-semibold tabular-nums">
                {evaluation.result?.formattedAmount ?? "Amount needs review"}
              </p>
            </div>
            <div className="border-line mt-6 grid gap-4 border-t pt-5 sm:grid-cols-3">
              <div>
                <p className="fact-label">Customer</p>
                <p className="mt-1 text-sm font-semibold">
                  Aster Works finance
                </p>
              </div>
              <div>
                <p className="fact-label">Business problem</p>
                <p className="mt-1 text-sm font-semibold">
                  Pay without publishing the vendor
                </p>
              </div>
              <div>
                <p className="fact-label">Your task</p>
                <p className="mt-1 text-sm font-semibold">
                  Clear controls, then inspect readiness
                </p>
              </div>
            </div>
          </div>

          <aside className="notice notice-hold items-start!" aria-live="polite">
            <span className="glyph glyph-attn" aria-hidden />
            <div>
              <strong>Next human action</strong>
              <p>{nextAction}</p>
              <p className="mt-3 text-xs">
                The sandbox calculates policy locally. It never records who
                acted or grants real financial authorization.
              </p>
            </div>
          </aside>
        </div>

        <div className="mt-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="fact-label">Choose a grounded scenario</p>
              <p className="text-muted mt-1 text-sm">
                Presets change inputs only. Outcomes are never prewritten.
              </p>
            </div>
            <button
              className="button button-light"
              type="button"
              onClick={reset}
            >
              <RotateCcw size={15} aria-hidden /> Reset
            </button>
          </div>
          <div
            className="mt-4 grid gap-3 md:grid-cols-3"
            role="group"
            aria-label="Payable scenario"
          >
            {demoScenarios.map((scenario, index) => {
              const active = activeScenario === scenario.id;
              return (
                <button
                  key={scenario.id}
                  type="button"
                  aria-pressed={active}
                  className={`card min-h-32 p-4 text-left transition ${active ? "border-gold-deep! bg-gold-pale!" : "hover:border-gold-deep"}`}
                  onClick={() => selectScenario(scenario.id)}
                >
                  <span className="font-mono text-xs font-semibold">
                    0{index + 1}
                  </span>
                  <span className="mt-4 block font-semibold">
                    {scenario.label}
                  </span>
                  <span className="text-muted mt-2 block text-xs leading-5">
                    {scenario.summary}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section aria-labelledby="control-results-heading">
        <div className="section-intro mb-5!">
          <div>
            <p className="eyebrow">Step 2 · Apply controls</p>
            <h2 id="control-results-heading" className="t-title mt-3 text-3xl!">
              A deterministic decision, not an AI opinion
            </h2>
          </div>
          <p className="t-small">
            The browser calls the same @obliq/domain and @obliq/policy functions
            as the persisted product. No API or database is used.
          </p>
        </div>

        {result ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,.9fr)]">
            <div className="sheet overflow-hidden">
              <div className="sheet-head">
                <div>
                  <p className="fact-label">Policy decision</p>
                  <p className="mt-1 text-lg font-semibold">
                    {result.decision.result.replaceAll("_", " ")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm font-semibold">
                    {result.formattedAmount}
                  </p>
                  <p className="text-muted mt-1 text-xs">
                    {blockers?.length ?? 0} blocking finding(s)
                  </p>
                </div>
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

            <div className="space-y-4">
              <div className="sheet p-5 md:p-6">
                <p className="fact-label">Required human action</p>
                <h3 className="mt-2 text-lg font-semibold">
                  Policy-derived thresholds
                </h3>
                <p className="text-muted mt-2 text-sm leading-6">
                  Counters below are an exercise—not people, signatures, or
                  persisted approvals.
                </p>
                {result.requirements.length ? (
                  <ul className="mt-4 space-y-3">
                    {result.requirements.map((requirement) => {
                      const complete =
                        requirement.approvedCount >= requirement.count;
                      return (
                        <li
                          key={requirement.role}
                          className="border-line border-t pt-3 first:border-0 first:pt-0"
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-semibold">
                                {requirement.role}
                              </p>
                              <p className="text-muted mt-1 text-xs leading-5">
                                {requirement.reason}
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
                                "A browser-only counter changed. No identity or approval was recorded.",
                              );
                            }}
                          >
                            {complete ? (
                              <Check size={15} aria-hidden />
                            ) : (
                              <UserRoundCheck size={15} aria-hidden />
                            )}
                            {complete
                              ? "Exercise threshold met"
                              : "Mark one exercise approval"}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-muted mt-4 text-sm">
                    Resolve blocking controls before exercising approvals.
                  </p>
                )}
              </div>
              <p className="text-muted text-xs leading-5" aria-live="polite">
                {changeNotice}
              </p>
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

        <details className="sheet mt-5 p-5">
          <summary className="cursor-pointer font-semibold">
            Adjust individual policy inputs
          </summary>
          <p className="text-muted mt-2 text-sm">
            Explore amount tiers, duplicates, completeness, and destination
            assurance. Every material change resets exercise counters.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
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
              description="Turn off to require first-payment Treasury review."
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
                  "Destination assurance changed. Exercise counters were reset.",
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
                  "Independent destination review changed. Exercise counters were reset.",
                )
              }
              label="Independent finance review recorded"
              description="Models a separate reviewer; this click is not a real review."
            />
          </div>
          <p
            id="demo-amount-error"
            className={evaluation.error ? "text-stop mt-4 text-sm" : "sr-only"}
            role={evaluation.error ? "alert" : undefined}
          >
            {evaluation.error ?? "Amount is valid."}
          </p>
        </details>
      </section>

      <section aria-labelledby="readiness-heading">
        <div className="section-intro mb-5!">
          <div>
            <p className="eyebrow">Step 3 · Read the outcome</p>
            <h2 id="readiness-heading" className="t-title mt-3 text-3xl!">
              Browser-calculated settlement readiness
            </h2>
          </div>
          <span className="cap cap-hatched">Not financial authorization</span>
        </div>
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
            <strong>
              Browser calculation: {ready ? "READY TO SETTLE" : "NOT READY"}
            </strong>
            <p>
              {ready
                ? "No readiness blocker remains in this fictional calculation. No obligation, approval, settlement intent, or payment was created."
                : (result?.readiness.reasons
                    .map((reason) => reason.message)
                    .join(" · ") ?? evaluation.error)}
            </p>
          </div>
        </div>

        <ol
          className="mt-6 grid gap-3 md:grid-cols-5"
          aria-label="Obliq lifecycle boundary"
        >
          {lifecycle.map(([name, description], index) => {
            const active = index === 0 || (index === 1 && Boolean(result));
            return (
              <li
                key={name}
                className={`card relative p-4 ${active ? "border-gold-deep!" : "bg-sunken!"}`}
              >
                <span className="font-mono text-xs font-semibold">
                  0{index + 1}
                </span>
                <h3 className="mt-3 text-sm font-semibold">{name}</h3>
                <p className="text-muted mt-1 text-xs leading-5">
                  {active ? description : "Not performed here"}
                </p>
                {index >= 2 && (
                  <LockKeyhole
                    size={14}
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
            <strong>The exercise stops before money movement</strong>
            <p>
              It does not authenticate a person, persist a record, contact a
              signer, broadcast, scan Zcash, reconcile, or issue evidence.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
