import { getRecipientSessionSummary } from "@obliq/database";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/db";
import { recipientNoStoreHeaders } from "@/lib/recipient-api";
import {
  recipientSecretHash,
  recipientSessionCookieName,
} from "@/lib/recipient-security";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";

export async function GET() {
  if (getRuntimeSecurityConfig().deploymentMode === "preview")
    return new Response("Not found", { status: 404 });
  const token = (await cookies()).get(recipientSessionCookieName())?.value;
  if (!token) return new Response("Not found", { status: 404 });
  const summary = await getRecipientSessionSummary(
    getDatabase(),
    recipientSecretHash("session", token),
  );
  if (!summary) return new Response("Not found", { status: 404 });
  return Response.json(
    {
      invitationId: summary.invitationId,
      obligation: {
        id: summary.obligationId,
        reference: summary.reference,
        amountMinor: summary.amountMinor.toString(),
        currency: summary.currency,
        dueAt: summary.dueAt?.toISOString() ?? null,
      },
      network: summary.network,
      contactVerification: "CONTACT_VERIFIED",
      addressOwnershipProof: "UNAVAILABLE",
      expiresAt: summary.expiresAt.toISOString(),
    },
    { headers: recipientNoStoreHeaders },
  );
}
