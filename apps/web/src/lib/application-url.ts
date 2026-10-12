export function applicationUrl(
  pathname: string,
  configured = process.env.OBLIQ_APP_BASE_URL,
) {
  if (!configured)
    throw new Error("OBLIQ_APP_BASE_URL is required for public redirects");
  const base = new URL(configured);
  if (base.protocol !== "https:" || base.username || base.password)
    throw new Error("OBLIQ_APP_BASE_URL is not a safe HTTPS origin");
  if (!pathname.startsWith("/") || pathname.startsWith("//"))
    throw new Error("Application redirect must be an absolute path");
  const destination = new URL(pathname, base.origin);
  if (destination.origin !== base.origin)
    throw new Error("Application redirect escaped the configured origin");
  return destination;
}
