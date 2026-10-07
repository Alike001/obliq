import Link from "next/link";
import {
  type FirstRunStep,
  nextFirstRunStep,
  waitingFirstRunStep,
} from "@/lib/first-run";

/**
 * Shown on the overview until the organization records its first obligation.
 * Every state comes from persisted, organization-scoped records.
 */
export function FirstRunGuide({ steps }: { steps: readonly FirstRunStep[] }) {
  const next = nextFirstRunStep(steps);
  const waiting = waitingFirstRunStep(steps);
  const done = steps.filter((step) => step.state === "done").length;
  return (
    <section className="sheet mt-8" aria-labelledby="first-run-h">
      <div className="sheet-head">
        <h2 id="first-run-h" className="t-section">
          Set up your first obligation
        </h2>
        <p className="t-small">
          {done} of {steps.length} steps done
        </p>
      </div>
      <div className="border-line border-b p-4 md:p-6">
        {next?.action ? (
          <NextAction step={next} />
        ) : (
          waiting && <WaitingAction step={waiting} />
        )}
      </div>
      <ol className="steps">
        {steps.map((step) => (
          <li
            key={step.id}
            data-state={
              step === next ? "next" : step.state === "done" ? "done" : "todo"
            }
          >
            <div>
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                <h3 className="font-semibold">{step.title}</h3>
                <StepState step={step} isNext={step === next} />
              </div>
              <p className="t-small mt-1 max-w-[68ch]">{step.text}</p>
              {step.blocker && step.state !== "done" && (
                <p className="mt-2 flex max-w-[68ch] items-start gap-2 text-[0.8125rem] font-medium">
                  <span
                    className={
                      step.state === "blocked"
                        ? "glyph glyph-stop text-stop mt-[0.2rem]"
                        : "glyph glyph-attn text-hold mt-[0.2rem]"
                    }
                    aria-hidden
                  />
                  {step.blocker}
                </p>
              )}
              {/* The next action already has the primary button above. */}
              {step.state === "next" && step !== next && step.action && (
                <Link
                  href={step.action.href}
                  className="button button-light mt-3"
                >
                  {step.action.label}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
      <p className="t-small border-line border-t px-4 py-4 md:px-6">
        An approved obligation has not been paid. Settlement happens later, on a
        signer you operate.
      </p>
    </section>
  );
}

function NextAction({ step }: { step: FirstRunStep }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-[68ch]">
        <p className="t-small font-semibold">Next action, for you</p>
        <p className="mt-1 text-[1.3125rem] leading-[1.3] font-semibold">
          {step.title}
        </p>
        <p className="text-ink-2 mt-1">{step.text}</p>
        {step.blocker && (
          <p className="mt-2 flex items-start gap-2 text-[0.8125rem] font-medium">
            <span
              className="glyph glyph-attn text-hold mt-[0.2rem]"
              aria-hidden
            />
            {step.blocker}
          </p>
        )}
      </div>
      {step.action && (
        <Link href={step.action.href} className="button button-dark">
          {step.action.label}
        </Link>
      )}
    </div>
  );
}

/** Nothing is open to this role: say who can move it on, and why. */
function WaitingAction({ step }: { step: FirstRunStep }) {
  return (
    <div className="notice notice-hold" role="note">
      <span className="glyph glyph-wait" aria-hidden />
      <div>
        <strong>Waiting on someone else: {step.title.toLowerCase()}</strong>
        <p>{step.blocker}</p>
      </div>
    </div>
  );
}

function StepState({ step, isNext }: { step: FirstRunStep; isNext: boolean }) {
  if (step.state === "done")
    return (
      <span className="tag tag-clear">
        <span className="glyph glyph-done" aria-hidden /> Done
      </span>
    );
  if (step.state === "blocked")
    return (
      <span className="tag tag-stop">
        <span className="glyph glyph-stop" aria-hidden /> Blocked
      </span>
    );
  if (step.state === "waiting")
    return (
      <span className="tag tag-hold">
        <span className="glyph glyph-wait" aria-hidden /> Waiting on{" "}
        {step.responsible?.replace(/^An /, "an ") ?? "someone else"}
      </span>
    );
  return (
    <span className="tag">
      <span className="glyph" aria-hidden />{" "}
      {isNext ? "Next, for you" : "Open to you"}
    </span>
  );
}
