import { recipientContactUpdateSchema } from "@obliq/domain";
import { updateRecipientContactEmail } from "@obliq/database";
import { getDatabase } from "@/lib/db";
import { recipientAdministrationErrorResponse } from "@/lib/recipient-admin-errors";
import { recipientNoStoreHeaders } from "@/lib/recipient-api";
import { recipientTokenPepper } from "@/lib/recipient-security";
import { rateLimitRequest, requireSameOrigin } from "@/lib/request-security";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";
import { getTenantContext } from "@/lib/session";
import { z } from "zod";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (getRuntimeSecurityConfig().deploymentMode === "preview")
    return new Response("Not found", { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getTenantContext();
    await rateLimitRequest(
      "recipient:vendor-contact:update",
      `${actor.organizationId}:${actor.userId}`,
      20,
      3600,
    );
    const id = z.uuid().parse((await params).id);
    const input = recipientContactUpdateSchema.parse(await request.json());
    const result = await updateRecipientContactEmail(
      getDatabase(),
      actor,
      id,
      input.contactEmail,
      recipientTokenPepper(),
    );
    return Response.json(
      {
        vendorId: result.vendor.id,
        contactEmail: result.vendor.contactEmail,
        revokedInvitationCount: result.revokedInvitationCount,
      },
      { headers: recipientNoStoreHeaders },
    );
  } catch (error) {
    return recipientAdministrationErrorResponse(error);
  }
}
