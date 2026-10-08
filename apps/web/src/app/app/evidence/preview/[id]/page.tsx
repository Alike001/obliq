import { verifyEvidenceArtifact } from "@obliq/evidence";
import { getEvidencePreview } from "@obliq/database";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceArtifact } from "@/components/evidence-artifact";
import { Notice } from "@/components/notice";
import { BackLink } from "@/components/record";
import { SubmitButton } from "@/components/submit-button";
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
  const expired = preview.expiresAt <= new Date();
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <BackLink href="/app/evidence" label="Evidence" />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Mandatory preview</p>
            <h1 className="mt-3 text-3xl font-medium">Recipient view</h1>
          </div>
          <p className="text-muted text-xs">
            Expires {preview.expiresAt.toLocaleString()}
          </p>
        </div>
        {!preview.issuedAt && !expired && valid && (
          <Notice tone="hold" title="Not issued yet" className="mt-6">
            This is exactly what the recipient will see. Nothing is shared until
            you issue it below.
          </Notice>
        )}
        {preview.issuedAt && (
          <Notice tone="info" title="Already issued" className="mt-6">
            This preview was issued and cannot be issued again. Find the package
            under issued evidence.
          </Notice>
        )}
        {!preview.issuedAt && expired && (
          <Notice tone="stop" title="Preview expired" className="mt-6">
            Nothing was issued. Start again from the evidence page to build a
            fresh preview.
          </Notice>
        )}
        {!valid && (
          <Notice tone="stop" title="Integrity check failed" className="mt-6">
            The preview content does not match its hash, so it cannot be issued.
            Nothing was shared.
          </Notice>
        )}
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
          {!preview.issuedAt && !expired && valid ? (
            <form action={issueEvidenceAction.bind(null, preview.id)}>
              <SubmitButton pendingLabel="Issuing…">
                Issue this evidence
              </SubmitButton>
            </form>
          ) : (
            <Link href="/app/evidence" className="button button-light">
              Back to evidence
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
