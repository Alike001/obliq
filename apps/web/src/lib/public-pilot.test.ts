import { describe, expect, it } from "vitest";
import { isPublicPilotRequestAllowed } from "./public-pilot";

describe("public pilot request boundary", () => {
  it.each([
    "/",
    "/pilot",
    "/app",
    "/app/vendors",
    "/app/obligations/id",
    "/docs",
    "/proof",
    "/security",
    "/feedback",
    "/health/ready",
    "/_next/static/chunk.js",
  ])("allows the intended GET surface %s", (pathname) => {
    expect(
      isPublicPilotRequestAllowed({
        method: "GET",
        pathname,
        serverAction: false,
      }),
    ).toBe(true);
  });

  it.each([
    "/auth/login",
    "/auth/callback",
    "/verify/public-id",
    "/payables/invitation",
    "/api/private-payables/challenges",
    "/api/private-payables/destination",
    "/api/private-payables/invitations",
  ])("blocks identity, recipient, evidence, and API routes %s", (pathname) => {
    expect(
      isPublicPilotRequestAllowed({
        method: "GET",
        pathname,
        serverAction: false,
      }),
    ).toBe(false);
  });

  it("allows only bounded pilot posts and app server actions", () => {
    for (const pathname of ["/pilot/start", "/pilot/reset", "/pilot/exit"])
      expect(
        isPublicPilotRequestAllowed({
          method: "POST",
          pathname,
          serverAction: false,
        }),
      ).toBe(true);
    expect(
      isPublicPilotRequestAllowed({
        method: "POST",
        pathname: "/app/obligations/new",
        serverAction: true,
      }),
    ).toBe(true);
    for (const pathname of [
      "/api/private-payables/destination",
      "/verify/id/artifact.json",
      "/app/obligations/new",
    ])
      expect(
        isPublicPilotRequestAllowed({
          method: "POST",
          pathname,
          serverAction: false,
        }),
      ).toBe(false);
    for (const method of ["PUT", "PATCH", "DELETE", "OPTIONS"])
      expect(
        isPublicPilotRequestAllowed({
          method,
          pathname: "/app",
          serverAction: true,
        }),
      ).toBe(false);
  });
});
