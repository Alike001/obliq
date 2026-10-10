import "server-only";

import { RecipientWorkflowError } from "@obliq/database";

export const recipientNoStoreHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
} as const;

export function recipientError(error: unknown) {
  if (error instanceof RecipientWorkflowError)
    return Response.json(
      { error: "RECIPIENT_WORKFLOW_UNAVAILABLE" },
      {
        status: error.code === "IDEMPOTENCY_CONFLICT" ? 409 : 404,
        headers: recipientNoStoreHeaders,
      },
    );
  return Response.json(
    { error: "RECIPIENT_WORKFLOW_UNAVAILABLE" },
    { status: 503, headers: recipientNoStoreHeaders },
  );
}
