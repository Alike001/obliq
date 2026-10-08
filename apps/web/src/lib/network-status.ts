import "server-only";

import type { PublicNetworkStatus, RuntimeNetwork } from "@obliq/security";
import { getRuntimeSecurityConfig } from "./runtime-config";

/**
 * The network status the server enforces. If configuration cannot be read the
 * most conservative status is reported; a page never claims more on failure.
 */
export function readNetworkStatus(): {
  status: PublicNetworkStatus;
  network: RuntimeNetwork;
} {
  try {
    const runtime = getRuntimeSecurityConfig();
    return { status: runtime.publicNetworkStatus, network: runtime.network };
  } catch {
    return { status: "PUBLIC_NETWORK_BLOCKED", network: "regtest" };
  }
}
