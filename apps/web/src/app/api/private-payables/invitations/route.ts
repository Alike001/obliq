import { recipientInvitationRequestSchema } from "@obliq/domain";
import {
  createRecipientInvitation,
  revokeRecipientInvitation,
} from "@obliq/database";
import { generateRecipientToken } from "@obliq/security";
import { getDatabase } from "@/lib/db";
import { sendRecipientEmail } from "@/lib/recipient-email";
import { recipientNoStoreHeaders } from "@/lib/recipient-api";
import {
  recipientSecretHash,
  recipientTokenPepper,
} from "@/lib/recipient-security";
import { rateLimitRequest, requireSameOrigin } from "@/lib/request-security";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";
import { getTenantContext } from "@/lib/session";

export async function POST(request: Request) {
  if (getRuntimeSecurityConfig().deploymentMode === "preview")
    return new Response("Not found", { status: 404 });
  try {
    requireSameOrigin(request);
    const actor = await getTenantContext();
    await rateLimitRequest(
      "recipient:invitation:create",
      `${actor.organizationId}:${actor.userId}`,
      20,
      3600,
    );
    const input = recipientInvitationRequestSchema.parse(await request.json());
    const rawToken = generateRecipientToken();
    const tokenHash = recipientSecretHash("invitation", rawToken);
    const runtime = getRuntimeSecurityConfig();
    if (runtime.network === "disabled") throw new Error("Network unavailable");
    const contact = await createRecipientInvitation(getDatabase(), actor, {
      obligationId: input.obligationId,
      tokenHash,
      contactPepper: recipientTokenPepper(),
      network: runtime.network,
    });
    const baseUrl =
      process.env.OBLIQ_APP_BASE_URL ?? new URL(request.url).origin;
    try {
      await sendRecipientEmail({
        kind: "INVITATION",
        to: contact.deliveryEmail,
        invitationUrl: `${baseUrl}/payables/invitation#token=${rawToken}`,
      });
    } catch (error) {
      await revokeRecipientInvitation(
        getDatabase(),
        actor,
        contact.invitation.id,
        "DELIVERY_FAILED",
      );
      throw error;
    }
    return Response.json(
      {
        invitationId: contact.invitation.id,
        state: "ACTIVE",
        expiresAt: contact.invitation.expiresAt.toISOString(),
      },
      { status: 201, headers: recipientNoStoreHeaders },
    );
  } catch {
    return Response.json(
      { error: "INVITATION_UNAVAILABLE" },
      { status: 400, headers: recipientNoStoreHeaders },
    );
  }
}
