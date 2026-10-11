import { RecipientAdministrationError } from "@obliq/database";
import { ZodError } from "zod";
import { RecipientEmailDeliveryError } from "./recipient-email";
import { recipientNoStoreHeaders } from "./recipient-api";

const statuses = {
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  MISSING_CONTACT: 409,
  OBLIGATION_CLOSED: 409,
  INVITATION_NOT_OPEN: 409,
  CONTACT_UNCHANGED: 409,
} as const;

export function recipientAdministrationErrorResponse(error: unknown) {
  if (error instanceof RecipientAdministrationError)
    return Response.json(
      { error: error.code },
      { status: statuses[error.code], headers: recipientNoStoreHeaders },
    );
  if (error instanceof RecipientEmailDeliveryError)
    return Response.json(
      { error: "EMAIL_DELIVERY_UNAVAILABLE" },
      { status: 502, headers: recipientNoStoreHeaders },
    );
  if (error instanceof ZodError)
    return Response.json(
      { error: "INVALID_REQUEST" },
      { status: 400, headers: recipientNoStoreHeaders },
    );
  return Response.json(
    { error: "OPERATION_UNAVAILABLE" },
    { status: 503, headers: recipientNoStoreHeaders },
  );
}
