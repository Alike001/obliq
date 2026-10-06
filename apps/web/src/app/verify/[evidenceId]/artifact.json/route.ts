import { evidenceJsonArtifact, verifyPublicEvidence } from "@obliq/database";
import { getDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ evidenceId: string }> },
) {
  const { evidenceId } = await params;
  const result = await verifyPublicEvidence(getDatabase(), evidenceId);
  if (!result) return new Response("Evidence not found", { status: 404 });
  if (!result.integrityValid)
    return new Response("Evidence integrity verification failed", {
      status: 409,
      headers: { "Cache-Control": "no-store" },
    });
  return new Response(evidenceJsonArtifact(result.evidence), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="obliq-evidence-${evidenceId.slice(0, 12)}.json"`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
