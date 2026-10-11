import { recipientInvitationRevocationSchema } from "@obliq/domain";
import { revokeRecipientInvitation } from "@obliq/database";
import { getDatabase } from "@/lib/db";
import { recipientNoStoreHeaders } from "@/lib/recipient-api";
import { recipientAdministrationErrorResponse } from "@/lib/recipient-admin-errors";
import { rateLimitRequest, requireSameOrigin } from "@/lib/request-security";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";
import { getTenantContext } from "@/lib/session";
import { z } from "zod";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (getRuntimeSecurityConfig().deploymentMode === "preview")
    return new Response("Not found", { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getTenantContext();
    await rateLimitRequest(
      "recipient:invitation:revoke",
      `${actor.organizationId}:${actor.userId}`,
      30,
      3600,
    );
    const id = z.uuid().parse((await params).id);
    const input = recipientInvitationRevocationSchema.parse(
      await request.json(),
    );
    const invitation = await revokeRecipientInvitation(
      getDatabase(),
      actor,
      id,
      input.reasonCode,
    );
    if (!invitation)
      return Response.json(
        { error: "NOT_FOUND" },
        { status: 404, headers: recipientNoStoreHeaders },
      );
    return Response.json(
      { invitationId: invitation.id, state: invitation.state },
      { headers: recipientNoStoreHeaders },
    );
  } catch (error) {
    return recipientAdministrationErrorResponse(error);
  }
}
