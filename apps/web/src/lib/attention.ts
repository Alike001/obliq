/**
 * The overview's attention queue: obligations that are waiting on a person,
 * most urgent first. Pure presentation logic over records the caller has
 * already read with tenant-scoped repository functions. It moves nothing and
 * decides nothing; the record page and its server actions do that.
 */

export interface AttentionInput {
  id: string;
  state: string;
  dueAt: Date | null;
}

// Lower comes first. A state that is not listed needs nobody right now.
const steps: Record<string, { rank: number; next: string }> = {
  SETTLEMENT_FAILED: { rank: 0, next: "Review the failed settlement" },
  RECONCILIATION_EXCEPTION: {
    rank: 0,
    next: "Review the reconciliation exception",
  },
  BLOCKED: { rank: 1, next: "Read the blocking control finding" },
  READY_TO_SETTLE: { rank: 2, next: "Prepare a settlement intent" },
  APPROVED: { rank: 3, next: "Evaluate settlement readiness" },
  APPROVAL_REQUIRED: { rank: 4, next: "Waiting for an approval decision" },
  UNDER_REVIEW: { rank: 5, next: "Evaluate controls" },
};

/** What a person does next for this state, or nothing if it needs nobody. */
export function nextStepFor(state: string): string | undefined {
  return steps[state]?.next;
}

/** Most urgent first; within a rank, the earliest due date first. */
export function attentionQueue<T extends AttentionInput>(
  records: readonly T[],
): (T & { next: string })[] {
  return records
    .flatMap((record) => {
      const step = steps[record.state];
      return step ? [{ record, step }] : [];
    })
    .sort(
      (a, b) =>
        a.step.rank - b.step.rank ||
        (a.record.dueAt?.getTime() ?? Infinity) -
          (b.record.dueAt?.getTime() ?? Infinity),
    )
    .map(({ record, step }) => ({ ...record, next: step.next }));
}
