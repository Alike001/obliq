import { describe, expect, it } from "vitest";
import { applicationUrl } from "./application-url";

describe("applicationUrl", () => {
  it("uses the validated public HTTPS origin instead of an internal request origin", () => {
    const request = new Request("http://127.0.0.1:3102/pilot/start");
    expect(request.url).toBe("http://127.0.0.1:3102/pilot/start");
    expect(applicationUrl("/app", "https://pilot.example.test").href).toBe(
      "https://pilot.example.test/app",
    );
  });

  it("preserves the configured port for an HTTPS-terminating proxy", () => {
    expect(
      applicationUrl("/pilot", "https://pilot.example.test:3443").href,
    ).toBe("https://pilot.example.test:3443/pilot");
  });

  it.each([
    ["http://pilot.example.test", "/app"],
    ["https://user:secret@pilot.example.test", "/app"],
    ["https://pilot.example.test", "https://attacker.example/app"],
    ["https://pilot.example.test", "//attacker.example/app"],
  ])("fails closed for unsafe base or destination %#", (base, pathname) => {
    expect(() => applicationUrl(pathname, base)).toThrow();
  });
});
