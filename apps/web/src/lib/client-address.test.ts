import { operationalFingerprint } from "@obliq/security";
import { describe, expect, it } from "vitest";
import { clientAddressFromHeaders } from "./client-address";

const pepper = "client-address-test-pepper-at-least-32-characters";

describe("client address extraction", () => {
  it("uses Render's first forwarded address and ignores appended spoof values", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 198.51.100.99, attacker-value",
      "x-real-ip": "192.0.2.20",
    });
    expect(clientAddressFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("does not turn malformed proxy input into attacker-selected subjects", () => {
    expect(
      clientAddressFromHeaders(
        new Headers({ "x-forwarded-for": "not-an-ip, 203.0.113.10" }),
      ),
    ).toBe("unknown");
  });

  it("keeps two legitimate clients in distinct opaque subjects", () => {
    const first = clientAddressFromHeaders(
      new Headers({ "x-forwarded-for": "203.0.113.10" }),
    );
    const second = clientAddressFromHeaders(
      new Headers({ "x-forwarded-for": "203.0.113.11" }),
    );
    expect(operationalFingerprint(first, pepper)).not.toBe(
      operationalFingerprint(second, pepper),
    );
  });
});
