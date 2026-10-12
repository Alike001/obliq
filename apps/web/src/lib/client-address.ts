import { isIP } from "node:net";

export function clientAddressFromHeaders(headers: Pick<Headers, "get">) {
  // Public Render traffic passes through Cloudflare. Render's current hosting
  // guidance identifies CF-Connecting-IP as the edge-controlled value because
  // X-Forwarded-For is appended and can retain caller-controlled entries.
  // Never fall back to a caller-provided forwarding header.
  const trusted = headers.get("cf-connecting-ip")?.trim();
  return trusted && isIP(trusted) ? trusted : "unknown";
}
