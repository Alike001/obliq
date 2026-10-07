import { ScopeTag } from "./status-pill";

const lanes = [
  { name: "Business approval", who: "Your finance team, in Obliq" },
  { name: "Signature", who: "Your signer, outside Obliq" },
  { name: "Observation", who: "Read-only observer" },
] as const;

export const lifecycleStages = [
  {
    name: "Capture",
    text: "Bring the bill into one controlled record. A person confirms every value.",
    lane: 0,
    regtest: false,
  },
  {
    name: "Control",
    text: "Policy decides which approvals the bill needs. People give them.",
    lane: 0,
    regtest: false,
  },
  {
    name: "Settle",
    text: "One exact shielded payment request goes to a signer you operate.",
    lane: 1,
    regtest: true,
  },
  {
    name: "Reconcile",
    text: "A read-only observer matches the payment back to the bill.",
    lane: 2,
    regtest: true,
  },
  {
    name: "Prove",
    text: "Issue evidence that discloses only the fields you choose.",
    lane: 0,
    regtest: false,
  },
] as const;

/**
 * The lifecycle as three lanes of authority. The steps are one ordered list;
 * on wide screens each is placed in the lane of whoever performs it, with an
 * oblique mark where authority passes to another lane. A hatched step is
 * proven on regtest only. It contains no financial data.
 */
export function AuthorityTrack() {
  return (
    <div className="track">
      {lanes.map((lane, index) => (
        <div
          key={lane.name}
          className="lane-bg"
          style={{ gridRow: index + 1 }}
          aria-hidden
        />
      ))}
      {lanes.map((lane, index) => (
        <p
          key={lane.name}
          className="lane-name"
          style={{ gridRow: index + 1 }}
          aria-hidden
        >
          <strong>{lane.name}</strong>
          <span>{lane.who}</span>
        </p>
      ))}
      <ol className="track-steps">
        {lifecycleStages.map((stage, index) => {
          const lane = lanes[stage.lane];
          const previous = lifecycleStages[index - 1]?.lane;
          const handoff = previous !== undefined && previous !== stage.lane;
          return (
            <li
              key={stage.name}
              className={[
                "step",
                stage.regtest ? "step-hatched" : "",
                handoff ? "step-handoff" : "",
                handoff && previous > stage.lane ? "step-handoff-up" : "",
              ].join(" ")}
              style={
                {
                  "--col": index + 1,
                  "--lane": stage.lane + 1,
                } as React.CSSProperties
              }
            >
              {/* Shown where a lane begins; always read out. */}
              <p
                className={
                  index === 0 || handoff ? "step-lane" : "step-lane sr-only"
                }
              >
                {lane.name}. <span>{lane.who}</span>
              </p>
              <div className="step-body">
                <span className="step-number" aria-hidden>
                  {index + 1}
                </span>
                <div>
                  <p className="step-name">{stage.name}</p>
                  <p className="step-text">{stage.text}</p>
                  {stage.regtest && (
                    <p className="step-scope">
                      <ScopeTag />
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
