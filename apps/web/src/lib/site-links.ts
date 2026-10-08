/**
 * Navigation and calls to action for the public pages.
 *
 * A read-only preview deployment serves no workspace, so nothing it shows may
 * link to one or invite a visitor to open it. Every public page takes its
 * links from here so that rule has one place to hold.
 */

export interface SiteLink {
  label: string;
  href: string;
}

export interface SiteLinks {
  nav: readonly SiteLink[];
  primary: SiteLink;
  secondary: SiteLink;
}

const nav = [
  { label: "Documentation", href: "/docs" },
  { label: "Security", href: "/security" },
  { label: "What is proven", href: "/proof" },
] as const;

/** True for the database-free public preview, where `/app` is not served. */
export function isReadOnlyPreview(
  env: Record<string, string | undefined> = process.env,
) {
  return env.OBLIQ_DEPLOYMENT_MODE === "preview";
}

export function siteLinks(readOnlyPreview: boolean): SiteLinks {
  if (readOnlyPreview)
    return {
      nav,
      primary: { label: "See what is proven", href: "/proof" },
      secondary: { label: "Read the documentation", href: "/docs" },
    };
  return {
    nav,
    primary: { label: "Open App", href: "/app" },
    secondary: { label: "See what is proven", href: "/proof" },
  };
}
