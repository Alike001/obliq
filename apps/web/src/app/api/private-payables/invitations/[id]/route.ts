import { recipientInvitationRevocationSchema } from "@obliq/domain";
import { revokeRecipientInvitation } from "@obliq/database";
import { getDatabase } from "@/lib/db";
import { recipientNoStoreHeaders } from "@/lib/recipient-api";
import { rateLimitRequest, requireSameOrigin } from "@/lib/request-security";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";
import { getTenantContext } from "@/lib/session";

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
    const { id } = await params;
    const input = recipientInvitationRevocationSchema.parse(
      await request.json(),
    );
    const invitation = await revokeRecipientInvitation(
      getDatabase(),
      actor,
      id,
      input.reasonCode,
    );
    if (!invitation) return new Response("Not found", { status: 404 });
    return Response.json(
      { invitationId: invitation.id, state: invitation.state },
      { headers: recipientNoStoreHeaders },
    );
  } catch {
    return Response.json(
      { error: "INVITATION_UNAVAILABLE" },
      { status: 400, headers: recipientNoStoreHeaders },
    );
  }
}
