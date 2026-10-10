import { recipientDestinationConfirmationSchema } from "@obliq/domain";
import {
  confirmRecipientDestination,
  getRecipientSessionSummary,
} from "@obliq/database";
import { ProcessZcashAddressInspector } from "@obliq/zcash/server";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getDatabase } from "@/lib/db";
import { recipientError, recipientNoStoreHeaders } from "@/lib/recipient-api";
import {
  recipientSecretHash,
  recipientSessionCookieName,
} from "@/lib/recipient-security";
import { rateLimitRequest, requireSameOrigin } from "@/lib/request-security";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";

export async function POST(request: Request) {
  if (getRuntimeSecurityConfig().deploymentMode === "preview")
    return new Response("Not found", { status: 404 });
  try {
    requireSameOrigin(request);
    const rawSession = (await cookies()).get(
      recipientSessionCookieName(),
    )?.value;
    if (!rawSession) return new Response("Not found", { status: 404 });
    const sessionTokenHash = recipientSecretHash("session", rawSession);
    await rateLimitRequest("recipient:destination", sessionTokenHash, 10, 1800);
    const input = recipientDestinationConfirmationSchema.parse(
      await request.json(),
    );
    const summary = await getRecipientSessionSummary(
      getDatabase(),
      sessionTokenHash,
    );
    if (!summary) return new Response("Not found", { status: 404 });
    if (!["regtest", "testnet", "mainnet"].includes(summary.network))
      throw new Error("Unsupported network");
    const inspection = await new ProcessZcashAddressInspector(
      process.env.OBSERVER_BINARY ?? "",
      summary.network as "regtest" | "testnet" | "mainnet",
    ).inspect(input.receiver);
    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          invitationId: summary.invitationId,
          obligationId: summary.obligationId,
          obligationVersion: summary.obligationVersion,
          network: summary.network,
          receiverFingerprint: inspection.receiverFingerprint,
        }),
      )
      .digest("hex");
    const result = await confirmRecipientDestination(getDatabase(), {
      sessionTokenHash,
      receiver: input.receiver,
      receiverFingerprint: inspection.receiverFingerprint,
      network: summary.network,
      idempotencyKeyHash: recipientSecretHash(
        "idempotency",
        input.idempotencyKey,
        summary.invitationId,
      ),
      requestHash,
    });
    return Response.json(
      {
        status: "RECIPIENT_CONFIRMED",
        destinationId: result.destination.id,
        destinationVersion: result.destination.version,
        verificationStatus: "UNVERIFIED",
        addressOwnershipProof: "UNAVAILABLE",
        recovered: result.recovered,
      },
      { headers: recipientNoStoreHeaders },
    );
  } catch (error) {
    return recipientError(error);
  }
}
