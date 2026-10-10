import { recipientChallengeVerificationSchema } from "@obliq/domain";
import {
  getRecipientVerificationContext,
  verifyRecipientContact,
} from "@obliq/database";
import { generateRecipientToken } from "@obliq/security";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDatabase } from "@/lib/db";
import { recipientNoStoreHeaders } from "@/lib/recipient-api";
import {
  recipientSecretHash,
  recipientSessionCookieName,
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
    await rateLimitRequest(
      "recipient:verify:ip",
      await requestSubject(),
      20,
      3600,
    );
    const input = recipientChallengeVerificationSchema.parse(
      await request.json(),
    );
    const invitationTokenHash = recipientSecretHash(
      "invitation",
      input.invitationToken,
    );
    const context = await getRecipientVerificationContext(
      getDatabase(),
      invitationTokenHash,
    );
    if (!context) throw new Error("Unavailable");
    const rawSessionToken = generateRecipientToken();
    await verifyRecipientContact(getDatabase(), {
      ...context,
      codeHash: recipientSecretHash(
        "challenge",
        input.code,
        `${context.invitationId}:${context.challengeId}`,
      ),
      sessionId: randomUUID(),
      sessionTokenHash: recipientSecretHash("session", rawSessionToken),
    });
    const response = NextResponse.json(
      { status: "CONTACT_VERIFIED", addressOwnershipProof: "UNAVAILABLE" },
      { headers: recipientNoStoreHeaders },
    );
    response.cookies.set(recipientSessionCookieName(), rawSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 30 * 60,
    });
    return response;
  } catch {
    return Response.json(
      { error: "RECIPIENT_WORKFLOW_UNAVAILABLE" },
      { status: 404, headers: recipientNoStoreHeaders },
    );
  }
}
