import "server-only";

import { ZcashAddressInspectionError } from "@obliq/zcash/server";
import { recipientError, recipientNoStoreHeaders } from "./recipient-api";

/** Maps only a cryptographically decoded address rejection to client error. */
export function recipientDestinationError(error: unknown) {
  if (
    error instanceof ZcashAddressInspectionError &&
    error.code === "ADDRESS_REJECTED"
  )
    return Response.json(
      { error: "INVALID_SHIELDED_DESTINATION" },
      { status: 422, headers: recipientNoStoreHeaders },
    );
  // Crashes, missing binaries, malformed output and every ambiguous failure
  // remain unavailable. They must never be presented as a financial fact.
  return recipientError(error);
}
