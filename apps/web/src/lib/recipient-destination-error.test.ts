import { ZcashAddressInspectionError } from "@obliq/zcash/server";
import { describe, expect, it, vi } from "vitest";
import { recipientDestinationError } from "./recipient-destination-error";

vi.mock("server-only", () => ({}));

describe("recipient destination error boundary", () => {
  it("returns 422 only for the sidecar's confirmed rejection", async () => {
    const response = recipientDestinationError(
      new ZcashAddressInspectionError("ADDRESS_REJECTED"),
    );
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({
      error: "INVALID_SHIELDED_DESTINATION",
    });
  });

  it("keeps every ambiguous inspector outcome at 503 without diagnostics", async () => {
    for (const error of [
      new ZcashAddressInspectionError("INSPECTOR_UNAVAILABLE"),
      new ZcashAddressInspectionError("MALFORMED_OUTPUT"),
      new Error("crash with utest1-sensitive-receiver"),
    ]) {
      const response = recipientDestinationError(error);
      expect(response.status).toBe(503);
      const body = JSON.stringify(await response.json());
      expect(body).toBe('{"error":"RECIPIENT_WORKFLOW_UNAVAILABLE"}');
      expect(body).not.toContain("utest1");
      expect(body).not.toContain("crash");
    }
  });
});
