export interface RecipientSessionSummary {
  invitationId: string;
  obligation: {
    id: string;
    reference: string;
    amountMinor: string;
    currency: string;
    dueAt: string | null;
  };
  network: "regtest" | "testnet" | "mainnet";
  contactVerification: "CONTACT_VERIFIED";
  addressOwnershipProof: "UNAVAILABLE";
  expiresAt: string;
}

interface BrowserLocation {
  hash: string;
  pathname: string;
  search: string;
}

interface BrowserHistory {
  replaceState(data: unknown, unused: string, url?: string | URL | null): void;
}

/**
 * Removes the fragment before returning its token. Fragments are not sent in
 * HTTP requests, and the returned token must remain in memory only.
 */
export function consumeInvitationToken(
  location: BrowserLocation,
  history: BrowserHistory,
) {
  const fragment = location.hash;
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  const token = new URLSearchParams(fragment.replace(/^#/u, "")).get("token");
  return token && token.length >= 43 && token.length <= 128 ? token : null;
}

export function parseRecipientSession(
  input: unknown,
): RecipientSessionSummary | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  const obligation = value.obligation;
  if (!obligation || typeof obligation !== "object") return null;
  const item = obligation as Record<string, unknown>;
  if (
    typeof value.invitationId !== "string" ||
    typeof item.id !== "string" ||
    typeof item.reference !== "string" ||
    typeof item.amountMinor !== "string" ||
    !/^\d+$/u.test(item.amountMinor) ||
    typeof item.currency !== "string" ||
    !/^[A-Z]{3}$/u.test(item.currency) ||
    (item.dueAt !== null && typeof item.dueAt !== "string") ||
    !["regtest", "testnet", "mainnet"].includes(String(value.network)) ||
    value.contactVerification !== "CONTACT_VERIFIED" ||
    value.addressOwnershipProof !== "UNAVAILABLE" ||
    typeof value.expiresAt !== "string"
  )
    return null;
  return input as RecipientSessionSummary;
}

export type DestinationFailure =
  "INVALID" | "UNAVAILABLE" | "CONFLICT" | "EXPIRED";

export function classifyDestinationFailure(status: number): DestinationFailure {
  if (status === 422) return "INVALID";
  if (status === 409) return "CONFLICT";
  if (status === 404) return "EXPIRED";
  return "UNAVAILABLE";
}

export interface DestinationAttempt {
  receiver: string;
  key: string;
}

export function destinationAttemptFor(
  current: DestinationAttempt | null,
  receiver: string,
  createKey: () => string,
): DestinationAttempt {
  const normalized = receiver.trim();
  return current?.receiver === normalized
    ? current
    : { receiver: normalized, key: createKey() };
}
