import { operationalFingerprint } from "@obliq/security";
import { describe, expect, it } from "vitest";
import { clientAddressFromHeaders } from "./client-address";

const pepper = "client-address-test-pepper-at-least-32-characters";

describe("client address extraction", () => {
  it("ignores a forged leftmost forwarded address in favor of Cloudflare", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.99, 203.0.113.10",
    });
    expect(clientAddressFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("does not trust a forged forwarded chain without the edge header", () => {
    expect(
      clientAddressFromHeaders(
        new Headers({
          "x-forwarded-for": "198.51.100.99, 203.0.113.10",
        }),
      ),
    ).toBe("unknown");
  });

  it("never falls back to a forged real-ip header", () => {
    expect(
      clientAddressFromHeaders(new Headers({ "x-real-ip": "198.51.100.99" })),
    ).toBe("unknown");
  });

  it("uses the bounded unknown subject when no trusted header exists", () => {
    expect(clientAddressFromHeaders(new Headers())).toBe("unknown");
    expect(
      clientAddressFromHeaders(
        new Headers({ "cf-connecting-ip": "not-an-ip" }),
      ),
    ).toBe("unknown");
  });

  it("keeps two legitimate clients in distinct opaque subjects", () => {
    const first = clientAddressFromHeaders(
      new Headers({ "cf-connecting-ip": "203.0.113.10" }),
    );
    const second = clientAddressFromHeaders(
      new Headers({ "cf-connecting-ip": "203.0.113.11" }),
    );
    expect(operationalFingerprint(first, pepper)).not.toBe(
      operationalFingerprint(second, pepper),
    );
  });
});
