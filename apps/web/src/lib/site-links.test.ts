import { describe, expect, it } from "vitest";
import { isReadOnlyPreview, siteLinks } from "./site-links";

const all = (links: ReturnType<typeof siteLinks>) => [
  ...links.nav,
  links.primary,
  links.secondary,
];

describe("public site links", () => {
  it("offers the workspace when one is served", () => {
    expect(siteLinks(false).primary).toEqual({
      label: "Open App",
      href: "/app",
    });
  });

  it("never links to or names the workspace in a read-only preview", () => {
    for (const link of all(siteLinks(true))) {
      expect(link.href.startsWith("/app")).toBe(false);
      expect(link.label).not.toMatch(/workspace|sign in|product/i);
    }
  });

  it("treats only the preview deployment mode as a preview", () => {
    expect(isReadOnlyPreview({ OBLIQ_DEPLOYMENT_MODE: "preview" })).toBe(true);
    for (const mode of ["development", "test", "production", undefined])
      expect(isReadOnlyPreview({ OBLIQ_DEPLOYMENT_MODE: mode })).toBe(false);
  });
});
