import { recipientChallengeRequestSchema } from "@obliq/domain";
import {
  createRecipientChallenge,
  getRecipientChallengeContext,
} from "@obliq/database";
import { generateRecipientCode } from "@obliq/security";
import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/db";
import { recipientNoStoreHeaders } from "@/lib/recipient-api";
import { sendRecipientEmail } from "@/lib/recipient-email";
import {
  recipientSecretHash,
  recipientTokenPepper,
} from "@/lib/recipient-security";
import {
  rateLimitRequest,
  requestSubject,
  requireSameOrigin,
} from "@/lib/request-security";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";

export async function POST(request: Request) {
  if (getRuntimeSecurityConfig().deploymentMode === "preview")
    return new Response("Not found", { status: 404 });
  try {
    requireSameOrigin(request);
    const input = recipientChallengeRequestSchema.parse(await request.json());
    const tokenHash = recipientSecretHash("invitation", input.invitationToken);
    const subject = await requestSubject();
    await rateLimitRequest("recipient:challenge:ip", subject, 10, 3600);
    await rateLimitRequest(
      "recipient:challenge:invitation",
      tokenHash,
      5,
      3600,
    );
    const context = await getRecipientChallengeContext(
      getDatabase(),
      tokenHash,
      recipientTokenPepper(),
    );
    if (context) {
      await rateLimitRequest(
        "recipient:challenge:contact",
        context.invitation.contactFingerprint,
        5,
        3600,
      );
      const deliveryEmail = context.deliveryEmail;
      if (!deliveryEmail) throw new Error("Delivery unavailable");
      const challengeId = randomUUID();
      const code = generateRecipientCode();
      await createRecipientChallenge(getDatabase(), {
        invitationId: context.invitation.id,
        organizationId: context.invitation.organizationId,
        challengeId,
        codeHash: recipientSecretHash(
          "challenge",
          code,
          `${context.invitation.id}:${challengeId}`,
        ),
      });
      await sendRecipientEmail({
        kind: "VERIFICATION_CODE",
        to: deliveryEmail,
        code,
      });
    }
  } catch {
    // Uniform response prevents token and contact enumeration.
  }
  return Response.json(
    { status: "IF_VALID_CODE_SENT" },
    { status: 202, headers: recipientNoStoreHeaders },
  );
}
