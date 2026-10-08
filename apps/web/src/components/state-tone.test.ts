import { describe, expect, it } from "vitest";
import { stateLabel, stateTone } from "./state-tone";

describe("state tag tones", () => {
  it("shows only a settled payment as clear", () => {
    expect(stateTone("SETTLED")).toBe("clear");
    for (const state of [
      "APPROVED",
      "READY_TO_SETTLE",
      "SETTLEMENT_PREPARED",
      "SIGNING",
      "SIGNED",
      "BROADCAST",
      "DETECTED",
      "CONFIRMING",
    ])
      expect(stateTone(state)).not.toBe("clear");
  });

  it("marks an approved obligation as ready, not paid", () => {
    expect(stateTone("APPROVED")).toBe("ready");
    expect(stateTone("READY_TO_SETTLE")).toBe("ready");
  });

  it("treats an unknown state as neutral", () => {
    expect(stateTone("SOMETHING_NEW")).toBe("neutral");
  });

  it("keeps the stored word in the label", () => {
    expect(stateLabel("READY_TO_SETTLE")).toBe("Ready to settle");
  });
});
