import {
  RateLimitExceededError,
  evidenceJsonArtifact,
  recordEvidenceAccess,
  verifyPublicEvidence,
} from "@obliq/database";
import { getDatabase } from "@/lib/db";
import { rateLimitRequest, requestSubject } from "@/lib/request-security";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ evidenceId: string }> },
) {
  if (getRuntimeSecurityConfig().deploymentMode === "preview")
    return new Response(
      "Evidence verification is unavailable in public preview",
      {
        status: 404,
        headers: { "Cache-Control": "no-store" },
      },
    );
  const { evidenceId } = await params;
  const subject = await requestSubject();
  try {
    await rateLimitRequest("evidence:download", subject, 20, 60);
  } catch (error) {
    if (error instanceof RateLimitExceededError)
      return new Response("Too many download requests", {
        status: 429,
        headers: {
          "Cache-Control": "no-store",
          "Retry-After": String(error.retryAfterSeconds),
        },
      });
    throw error;
  }
  const result = await verifyPublicEvidence(getDatabase(), evidenceId);
  if (!result) return new Response("Evidence not found", { status: 404 });
  if (!result.integrityValid)
    return new Response("Evidence integrity verification failed", {
      status: 409,
      headers: { "Cache-Control": "no-store" },
    });
  await recordEvidenceAccess(getDatabase(), {
    organizationId: result.evidence.organizationId,
    evidencePackageId: result.evidence.id,
    action: "DOWNLOAD",
    subjectFingerprint: subject,
    outcome: result.evidence.status,
  });
  return new Response(evidenceJsonArtifact(result.evidence), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="obliq-evidence-${evidenceId.slice(0, 12)}.json"`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer",
    },
  });
}
