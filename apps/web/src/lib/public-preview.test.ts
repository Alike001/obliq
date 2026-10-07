import { describe, expect, it } from "vitest";
import { isPublicPreviewRequestAllowed } from "./public-preview";

describe("public preview request boundary", () => {
  it.each([
    "/",
    "/docs",
    "/docs/privacy-model",
    "/security",
    "/proof",
    "/robots.txt",
    "/health/live",
    "/health/ready",
    "/icon.svg",
    "/_next/static/chunk.js",
  ])("allows the read-only public surface %s", (pathname) => {
    expect(
      isPublicPreviewRequestAllowed({
        method: "GET",
        pathname,
        serverAction: false,
      }),
    ).toBe(true);
  });

  it.each([
    "/app",
    "/app/obligations",
    "/auth/login",
    "/auth/callback",
    "/verify/public-id",
    "/verify/public-id/artifact.json",
  ])("blocks the database or authority surface %s", (pathname) => {
    expect(
      isPublicPreviewRequestAllowed({
        method: "GET",
        pathname,
        serverAction: false,
      }),
    ).toBe(false);
  });

  it("blocks mutations and server actions even on an allowed path", () => {
    expect(
      isPublicPreviewRequestAllowed({
        method: "POST",
        pathname: "/",
        serverAction: false,
      }),
    ).toBe(false);
    expect(
      isPublicPreviewRequestAllowed({
        method: "POST",
        pathname: "/",
        serverAction: true,
      }),
    ).toBe(false);
  });
});
