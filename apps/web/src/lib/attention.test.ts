import { describe, expect, it } from "vitest";
import { attentionQueue, nextStepFor } from "./attention";

const record = (id: string, state: string, due?: string) => ({
  id,
  state,
  dueAt: due ? new Date(due) : null,
});

describe("attention queue", () => {
  it("leaves out records that need nobody", () => {
    const queue = attentionQueue([
      record("a", "SETTLED"),
      record("b", "DRAFT"),
      record("c", "CONFIRMING"),
      record("d", "CANCELLED"),
    ]);
    expect(queue).toEqual([]);
  });

  it("puts failures and blocks ahead of routine review", () => {
    const queue = attentionQueue([
      record("review", "UNDER_REVIEW"),
      record("ready", "READY_TO_SETTLE"),
      record("blocked", "BLOCKED"),
      record("failed", "SETTLEMENT_FAILED"),
    ]);
    expect(queue.map((item) => item.id)).toEqual([
      "failed",
      "blocked",
      "ready",
      "review",
    ]);
  });

  it("orders one rank by the earliest due date, undated last", () => {
    const queue = attentionQueue([
      record("none", "UNDER_REVIEW"),
      record("late", "UNDER_REVIEW", "2026-12-01"),
      record("soon", "UNDER_REVIEW", "2026-10-10"),
    ]);
    expect(queue.map((item) => item.id)).toEqual(["soon", "late", "none"]);
  });

  it("never describes an unpaid obligation as paid", () => {
    for (const state of ["APPROVED", "READY_TO_SETTLE", "APPROVAL_REQUIRED"])
      expect(nextStepFor(state)).not.toMatch(/paid|settled|complete/i);
    expect(nextStepFor("SETTLED")).toBeUndefined();
  });
});
