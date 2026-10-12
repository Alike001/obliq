import { describe, expect, it } from "vitest";
import { cookieValue } from "./cookie-value";

describe("cookieValue", () => {
  it("reads the production __Host cookie without regex construction", () => {
    expect(
      cookieValue(
        "theme=quiet; __Host-obliq_session=opaque-token_123; other=value",
        "__Host-obliq_session",
      ),
    ).toBe("opaque-token_123");
  });

  it("requires an exact cookie name", () => {
    expect(
      cookieValue("not__Host-obliq_session=value", "__Host-obliq_session"),
    ).toBeNull();
  });

  it("fails closed for missing, empty, and malformed encoded values", () => {
    expect(cookieValue(null, "__Host-obliq_session")).toBeNull();
    expect(
      cookieValue("__Host-obliq_session=", "__Host-obliq_session"),
    ).toBeNull();
    expect(
      cookieValue("__Host-obliq_session=%E0%A4%A", "__Host-obliq_session"),
    ).toBeNull();
  });
});
