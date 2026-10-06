import { verifyEvidenceArtifact } from "@obliq/evidence";
import { getEvidencePreview } from "@obliq/database";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceArtifact } from "@/components/evidence-artifact";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { issueEvidenceAction } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function EvidencePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getTenantContext();
  const preview = await getEvidencePreview(getDatabase(), actor, id);
  if (!preview) notFound();
  const valid = verifyEvidenceArtifact(
    preview.artifactJson,
    preview.artifactHash,
  );
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/app/evidence" className="text-muted text-sm">
          ← Evidence
        </Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Mandatory preview</p>
            <h1 className="mt-3 text-3xl font-medium">Recipient view</h1>
          </div>
          <p className="text-muted text-xs">
            Expires {preview.expiresAt.toLocaleString()}
          </p>
        </div>
        <div className="mt-7">
          <EvidenceArtifact
            artifact={preview.artifactJson}
            contentHash={preview.artifactHash}
            status="PREVIEW"
            integrityValid={valid}
          />
        </div>
        <div className="card mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
          <p className="text-muted max-w-xl text-xs leading-5">
            Issuance freezes this exact content and hash. Corrections require a
            new package or superseding version; issued content is never edited.
          </p>
          {!preview.issuedAt && preview.expiresAt > new Date() && valid ? (
            <form action={issueEvidenceAction.bind(null, preview.id)}>
              <button className="button button-dark">
                Issue this evidence
              </button>
            </form>
          ) : (
            <span className="font-mono text-xs">
              {preview.issuedAt ? "ALREADY ISSUED" : "UNAVAILABLE"}
            </span>
          )}
        </div>
      </div>
    </main>
  );
}
