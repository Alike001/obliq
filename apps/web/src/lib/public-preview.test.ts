import { describe, expect, it } from "vitest";
import { isPublicPreviewRequestAllowed } from "./public-preview";

describe("public preview request boundary", () => {
  it.each([
    "/",
    "/demo",
    "/feedback",
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
    "/payables/invitation",
    "/api/private-payables/challenges",
    "/api/private-payables/session",
    "/api/private-payables/invitations",
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
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
      expect(
        isPublicPreviewRequestAllowed({
          method,
          pathname: "/demo",
          serverAction: false,
        }),
      ).toBe(false);
    for (const pathname of ["/", "/demo", "/feedback"])
      expect(
        isPublicPreviewRequestAllowed({
          method: "POST",
          pathname,
          serverAction: true,
        }),
      ).toBe(false);
  });

  it("allows HEAD but rejects server actions and demo lookalikes", () => {
    expect(
      isPublicPreviewRequestAllowed({
        method: "HEAD",
        pathname: "/demo",
        serverAction: false,
      }),
    ).toBe(true);
    expect(
      isPublicPreviewRequestAllowed({
        method: "GET",
        pathname: "/demo",
        serverAction: true,
      }),
    ).toBe(false);
    for (const pathname of [
      "/demo/",
      "/demo/action",
      "/Demo",
      "/demo%2Faction",
      "//demo",
    ])
      expect(
        isPublicPreviewRequestAllowed({
          method: "GET",
          pathname,
          serverAction: false,
        }),
      ).toBe(false);
  });
});
