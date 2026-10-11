/**
 * Browser-side rules for the recipient confirmation page.
 *
 * Everything here is a pure function of its arguments so the page's decisions
 * can be tested without a browser. The server stays the only authority: these
 * helpers read its responses, they never stand in for them.
 */
import { formatMinorUnits } from "@obliq/domain";

const tokenPattern = /^[A-Za-z0-9_-]{43,128}$/u;

/**
 * Reads the one-time token from a URL fragment such as `#token=…`. The
 * fragment is the only place the token may arrive: a query string would be
 * sent to the server, logged and passed on in referrers.
 */
export function readInvitationToken(hash: string): string | null {
  const fragment = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!fragment) return null;
  const token = new URLSearchParams(fragment).get("token");
  return token && tokenPattern.test(token) ? token : null;
}

/** Keeps digits only, so a code pasted as "123 456" still reads as six. */
export function normalizeCode(input: string) {
  return input.replace(/\D/gu, "").slice(0, 6);
}

export function isCompleteCode(code: string) {
  return /^\d{6}$/u.test(code);
}

/** A challenge stops accepting codes after this many wrong attempts. */
export const maxCodeAttempts = 5;

export type RecipientNetwork = "regtest" | "testnet" | "mainnet";

const networks: Record<
  RecipientNetwork,
  { label: string; prefix: string; note: string | null }
> = {
  mainnet: { label: "Zcash mainnet", prefix: "u1", note: null },
  testnet: {
    label: "Zcash testnet",
    prefix: "utest1",
    note: "A public test network. Its coins have no monetary value.",
  },
  regtest: {
    label: "Zcash regtest",
    prefix: "uregtest1",
    note: "An isolated test network. Its coins have no monetary value.",
  },
};

export function isRecipientNetwork(value: unknown): value is RecipientNetwork {
  return typeof value === "string" && value in networks;
}

export function networkLabel(network: RecipientNetwork) {
  return networks[network].label;
}

export function networkNote(network: RecipientNetwork) {
  return networks[network].note;
}

export function unifiedAddressPrefix(network: RecipientNetwork) {
  return networks[network].prefix;
}

export type ReceiverProblem =
  | "EMPTY"
  | "TOO_SHORT"
  | "TOO_LONG"
  | "HAS_SPACES"
  | "TRANSPARENT"
  | "SAPLING"
  | "WRONG_NETWORK"
  | "NOT_UNIFIED";

const bech32Body = /^[02-9ac-hj-np-z]+$/u;

/**
 * A first look at what was typed, to catch an address of the wrong kind
 * before it is sent. Passing this is not validation: only the server can
 * decode the address and check that it has a shielded Orchard receiver and
 * no transparent one.
 */
export function receiverProblem(
  input: string,
  network: RecipientNetwork,
): ReceiverProblem | null {
  const value = input.trim();
  if (!value) return "EMPTY";
  if (/\s/u.test(value)) return "HAS_SPACES";
  const lower = value.toLowerCase();
  if (/^(zs1|ztestsapling1|zregtestsapling1)/u.test(lower)) return "SAPLING";
  if (/^(t1|t3|tm|t2|tex1|textest1)/u.test(lower) && value.length < 80)
    return "TRANSPARENT";
  const expected = networks[network].prefix;
  if (!lower.startsWith(expected)) {
    const other = Object.values(networks).some(
      (item) => item.prefix !== expected && lower.startsWith(item.prefix),
    );
    return other ? "WRONG_NETWORK" : "NOT_UNIFIED";
  }
  if (!bech32Body.test(lower.slice(expected.length))) return "NOT_UNIFIED";
  if (value.length < 20) return "TOO_SHORT";
  if (value.length > 512) return "TOO_LONG";
  return null;
}

export function receiverProblemMessage(
  problem: ReceiverProblem,
  network: RecipientNetwork,
) {
  const prefix = networks[network].prefix;
  const label = networks[network].label;
  switch (problem) {
    case "EMPTY":
      return "Enter the Unified Address you want the payer to review.";
    case "HAS_SPACES":
      return "The address contains a space or line break. Paste it again as one unbroken line.";
    case "TOO_SHORT":
      return "This is too short to be a Unified Address. Copy the whole address from your wallet.";
    case "TOO_LONG":
      return "This is longer than an address can be. Paste only the address.";
    case "TRANSPARENT":
      return "This is a transparent address. This link accepts only a shielded Unified Address, because a transparent payment would be public.";
    case "SAPLING":
      return `This is a Sapling address. This link needs a Unified Address, which starts with ${prefix}.`;
    case "WRONG_NETWORK":
      return `This address belongs to a different Zcash network. This obligation is on ${label}, where a Unified Address starts with ${prefix}.`;
    case "NOT_UNIFIED":
      return `This does not look like a Unified Address for ${label}. One starts with ${prefix} and uses lowercase letters and digits only.`;
  }
}

/** Head and tail of an address, for a person to compare against a wallet. */
export function abbreviateReceiver(receiver: string, edge = 12) {
  const value = receiver.trim();
  if (value.length <= edge * 2 + 1) return value;
  return `${value.slice(0, edge)}…${value.slice(-edge)}`;
}

/** Groups of four, so two long addresses can be compared by eye. */
export function groupReceiver(receiver: string, size = 4) {
  const value = receiver.trim();
  const groups: string[] = [];
  for (let index = 0; index < value.length; index += size)
    groups.push(value.slice(index, index + size));
  return groups;
}

export interface RecipientSummary {
  /** Opaque scope for local retry state. Never shown to the recipient. */
  invitationId: string;
  reference: string;
  amount: string;
  dueAt: Date | null;
  network: RecipientNetwork;
  sessionExpiresAt: Date;
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function date(value: unknown) {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Accepts the session summary only when every field the page shows is
 * present and well formed. Anything else is treated as no summary at all,
 * so a malformed reply can never render as a half-filled obligation.
 */
export function parseSessionSummary(body: unknown): RecipientSummary | null {
  const root = record(body);
  const obligation = record(root?.obligation);
  if (!root || !obligation) return null;
  if (root.contactVerification !== "CONTACT_VERIFIED") return null;
  if (root.addressOwnershipProof !== "UNAVAILABLE") return null;
  const { reference, amountMinor, currency, dueAt } = obligation;
  const sessionExpiresAt = date(root.expiresAt);
  if (
    typeof root.invitationId !== "string" ||
    typeof reference !== "string" ||
    !reference ||
    typeof amountMinor !== "string" ||
    !/^\d{1,30}$/u.test(amountMinor) ||
    typeof currency !== "string" ||
    !isRecipientNetwork(root.network) ||
    !sessionExpiresAt
  )
    return null;
  if (dueAt !== null && !date(dueAt)) return null;
  let amount: string;
  try {
    amount = formatMinorUnits(BigInt(amountMinor), currency);
  } catch {
    return null;
  }
  return {
    invitationId: root.invitationId,
    reference,
    amount,
    dueAt: date(dueAt),
    network: root.network,
    sessionExpiresAt,
  };
}

export interface RecipientConfirmation {
  destinationVersion: number;
  /** True when the server returned the result of an earlier submission. */
  recovered: boolean;
}

/**
 * A confirmation counts only if the server says the destination is recorded,
 * still unverified, and that address ownership was not proved. A reply that
 * claims anything else is not one this page knows how to describe truthfully.
 */
export function parseConfirmation(body: unknown): RecipientConfirmation | null {
  const root = record(body);
  if (
    !root ||
    root.status !== "RECIPIENT_CONFIRMED" ||
    root.verificationStatus !== "UNVERIFIED" ||
    root.addressOwnershipProof !== "UNAVAILABLE" ||
    typeof root.destinationId !== "string" ||
    typeof root.destinationVersion !== "number" ||
    !Number.isInteger(root.destinationVersion) ||
    typeof root.recovered !== "boolean"
  )
    return null;
  return {
    destinationVersion: root.destinationVersion,
    recovered: root.recovered,
  };
}

/** What came back from a same-origin call, with transport failure explicit. */
export type ApiReply =
  { kind: "response"; status: number; body: unknown } | { kind: "unreachable" };

export type ChallengeOutcome = "SENT_IF_VALID" | "UNREACHABLE";

/**
 * The server answers every challenge request the same way, valid link or
 * not, so the most this page can ever say is that a code was sent if the
 * link is valid.
 */
export function challengeOutcome(reply: ApiReply): ChallengeOutcome {
  if (reply.kind !== "response" || reply.status !== 202) return "UNREACHABLE";
  return record(reply.body)?.status === "IF_VALID_CODE_SENT"
    ? "SENT_IF_VALID"
    : "UNREACHABLE";
}

export type VerificationOutcome = "VERIFIED" | "NOT_ACCEPTED" | "UNCERTAIN";

export function verificationOutcome(reply: ApiReply): VerificationOutcome {
  if (reply.kind !== "response") return "UNCERTAIN";
  if (reply.status === 404) return "NOT_ACCEPTED";
  const body = record(reply.body);
  return reply.status === 200 &&
    body?.status === "CONTACT_VERIFIED" &&
    body.addressOwnershipProof === "UNAVAILABLE"
    ? "VERIFIED"
    : "UNCERTAIN";
}

export type SummaryOutcome =
  | { kind: "SUMMARY"; summary: RecipientSummary }
  | { kind: "NO_SESSION" }
  | { kind: "UNCERTAIN" };

export function summaryOutcome(reply: ApiReply): SummaryOutcome {
  if (reply.kind !== "response") return { kind: "UNCERTAIN" };
  if (reply.status === 404) return { kind: "NO_SESSION" };
  if (reply.status !== 200) return { kind: "UNCERTAIN" };
  const summary = parseSessionSummary(reply.body);
  return summary ? { kind: "SUMMARY", summary } : { kind: "UNCERTAIN" };
}

export type DestinationOutcome =
  | { kind: "CONFIRMED"; confirmation: RecipientConfirmation }
  /** The read-only sidecar definitively rejected the submitted address. */
  | { kind: "INVALID" }
  /** The link or session can no longer accept an address. */
  | { kind: "CLOSED" }
  /** An address was already recorded with different details. */
  | { kind: "CONFLICT" }
  /**
   * Nothing is known. The address may have been rejected, the service may be
   * down, or the address may have been recorded and the reply lost. The only
   * safe next step is to send the same request again with the same key.
   */
  | { kind: "UNCERTAIN" };

export function destinationOutcome(reply: ApiReply): DestinationOutcome {
  if (reply.kind !== "response") return { kind: "UNCERTAIN" };
  if (reply.status === 404) return { kind: "CLOSED" };
  if (reply.status === 409) return { kind: "CONFLICT" };
  if (
    reply.status === 422 &&
    record(reply.body)?.error === "INVALID_SHIELDED_DESTINATION"
  )
    return { kind: "INVALID" };
  if (reply.status !== 200) return { kind: "UNCERTAIN" };
  const confirmation = parseConfirmation(reply.body);
  return confirmation
    ? { kind: "CONFIRMED", confirmation }
    : { kind: "UNCERTAIN" };
}

/** Whole minutes left, rounded up, and never below zero. */
export function minutesRemaining(expiresAt: Date, now: Date) {
  return Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / 60_000));
}

export interface StoredAttempt {
  invitationId: string;
  idempotencyKey: string;
  /** Exact destination bound to the key once the first POST starts. */
  receiver: string | null;
  state: "UNSENT" | "PENDING" | "CONFIRMED";
}

/**
 * The retry key for one invitation, kept for the life of the browser tab so
 * a reload after an uncertain reply repeats the same request instead of
 * making a new one. It is not a credential: without the HttpOnly session
 * cookie it does nothing. The invitation token is never stored.
 */
export const attemptStorageKey = "obliq.recipient.attempt";

export function readStoredAttempt(
  raw: string | null,
  invitationId: string,
): StoredAttempt | null {
  if (!raw) return null;
  try {
    const value = record(JSON.parse(raw));
    if (
      value?.invitationId !== invitationId ||
      typeof value.idempotencyKey !== "string" ||
      value.idempotencyKey.length < 16 ||
      value.idempotencyKey.length > 128 ||
      !["UNSENT", "PENDING", "CONFIRMED"].includes(String(value.state)) ||
      (value.receiver !== null && typeof value.receiver !== "string") ||
      (typeof value.receiver === "string" &&
        (value.receiver.length === 0 || value.receiver.length > 512)) ||
      (value.state !== "UNSENT" && typeof value.receiver !== "string")
    )
      return null;
    return {
      invitationId,
      idempotencyKey: value.idempotencyKey,
      receiver: value.receiver,
      state: value.state as StoredAttempt["state"],
    };
  } catch {
    return null;
  }
}

/**
 * True when this tab still holds an address whose submission never got an
 * authoritative answer. It is read before the invitation is known, so a page
 * that cannot load its details can still say that an earlier request is
 * unresolved instead of claiming that nothing happened.
 */
export function hasUnresolvedAttempt(raw: string | null) {
  if (!raw) return false;
  try {
    const value = record(JSON.parse(raw));
    return (
      value?.state === "PENDING" &&
      typeof value.receiver === "string" &&
      value.receiver.length > 0
    );
  } catch {
    return false;
  }
}
