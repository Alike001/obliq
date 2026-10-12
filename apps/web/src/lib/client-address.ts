import { isIP } from "node:net";

export function clientAddressFromHeaders(headers: Pick<Headers, "get">) {
  // Render documents that it places the real client address first. Ignore
  // proxy-chain values after the first entry and fail into the shared
  // "unknown" subject when the trusted edge does not supply a valid address.
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded && isIP(forwarded)) return forwarded;
  const real = headers.get("x-real-ip")?.trim();
  return real && isIP(real) ? real : "unknown";
}
