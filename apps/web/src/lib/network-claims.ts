import type { PublicNetworkStatus, RuntimeNetwork } from "@obliq/security";

/**
 * The one place the public pages turn the runtime network status into words.
 * It reads the status the server already enforces, so a page cannot claim more
 * than the release allows.
 */

export type NetworkClaimTone = "verified" | "ready" | "pending" | "blocked";

export interface NetworkClaim {
  id: "regtest" | "testnet-sync" | "public-settlement" | "mainnet";
  subject: string;
  label: string;
  tone: NetworkClaimTone;
  /** Set when the claim holds on a test network only. */
  scope?: "Regtest";
  detail: string;
}

export function networkClaims(
  status: PublicNetworkStatus,
  network: RuntimeNetwork,
): NetworkClaim[] {
  const ready = status === "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST";
  const verified = status === "PUBLIC_NETWORK_VERIFIED";
  return [
    {
      id: "regtest",
      subject: "Regtest shielded settlement",
      label: "Verified",
      tone: "verified",
      scope: "Regtest",
      detail:
        "External signing, broadcast and read-only reconciliation, end to end on an isolated test network.",
    },
    {
      id: "testnet-sync",
      subject: "Public testnet read-only synchronization",
      label: verified
        ? "Verified"
        : ready
          ? "Ready for funded test"
          : "Blocked",
      tone: verified ? "verified" : ready ? "ready" : "blocked",
      detail: verified
        ? "The observer has synchronized with the public test network."
        : ready
          ? "The observer is qualified to attempt a funded test. No funds have moved."
          : "Obliq has not proven synchronization with a public network.",
    },
    {
      id: "public-settlement",
      subject: "Public funded settlement",
      label: verified ? "Verified" : "Not verified",
      tone: verified ? "verified" : "pending",
      detail: verified
        ? `A funded shielded payment has been settled and reconciled on ${network}.`
        : "No funded shielded payment has been settled on a public network.",
    },
    {
      id: "mainnet",
      subject: "Mainnet",
      label: verified && network === "mainnet" ? "Verified" : "Blocked",
      tone: verified && network === "mainnet" ? "verified" : "blocked",
      detail:
        verified && network === "mainnet"
          ? "Mainnet operation has been verified."
          : "Mainnet operation is blocked.",
    },
  ];
}

/** The short form, for places that have room for one or two sentences. */
export function networkSummary(status: PublicNetworkStatus): {
  lead: string;
  rest: string;
} {
  if (status === "PUBLIC_NETWORK_VERIFIED")
    return {
      lead: "Shielded settlement is verified on regtest and on a public network.",
      rest: "Mainnet is listed separately below.",
    };
  if (status === "PUBLIC_NETWORK_READY_FOR_FUNDED_TEST")
    return {
      lead: "Shielded settlement is verified on regtest only.",
      rest: "Public testnet read-only synchronization is ready for a funded test; funded public settlement is not verified and mainnet is blocked.",
    };
  return {
    lead: "Shielded settlement is verified on regtest only.",
    rest: "Public-network operation is blocked.",
  };
}
