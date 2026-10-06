import { verifyEvidenceArtifact } from "@obliq/evidence";
import { getEvidencePackage } from "@obliq/database";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EvidenceArtifact } from "@/components/evidence-artifact";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { previewEvidenceAction, revokeEvidenceAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EvidenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await getTenantContext();
  const evidence = await getEvidencePackage(getDatabase(), actor, id);
  if (!evidence) notFound();
  const valid = verifyEvidenceArtifact(
    evidence.artifactJson,
    evidence.artifactHash,
  );
  return (
    <main className="p-4 md:p-8">
      <div className="mx-auto max-w-4xl">
        <Link href="/app/evidence" className="text-muted text-sm">
          ← Evidence
        </Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Issued package</p>
            <h1 className="mt-3 text-3xl font-medium">Controlled evidence</h1>
          </div>
          <div className="flex gap-2">
            <a
              className="button button-light"
              href={`/verify/${evidence.publicId}`}
              target="_blank"
              rel="noreferrer"
            >
              Open recipient view
            </a>
            <a
              className="button button-dark"
              href={`/verify/${evidence.publicId}/artifact.json`}
            >
              Download JSON
            </a>
          </div>
        </div>
        <div className="mt-7">
          <EvidenceArtifact
            artifact={evidence.artifactJson}
            contentHash={evidence.artifactHash}
            status={evidence.status}
            integrityValid={valid}
          />
        </div>
        {evidence.status !== "ACTIVE" && (
          <section className="card mt-5 border-amber-300 p-5">
            <h2 className="font-semibold">Package status</h2>
            <p className="mt-2 text-sm">{evidence.status}</p>
            {evidence.statusChangedAt && (
              <p className="text-muted mt-1 text-xs">
                Changed {evidence.statusChangedAt.toLocaleString()}
              </p>
            )}
            {evidence.statusReason && (
              <p className="text-muted mt-3 text-xs leading-5">
                Internal reason: {evidence.statusReason}
              </p>
            )}
          </section>
        )}
        <section className="card mt-5 p-5">
          <h2 className="font-semibold">Share safely</h2>
          <p className="text-muted mt-2 text-xs leading-5">
            Anyone with this high-entropy link can see only the fields embedded
            in this immutable package. Treat the link as confidential recipient
            material.
          </p>
          <code className="mt-4 block rounded-lg bg-stone-950 p-3 text-xs break-all text-white">
            /verify/{evidence.publicId}
          </code>
        </section>
        {evidence.status === "ACTIVE" && (
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <section className="card p-5">
              <h2 className="font-semibold">Create corrected version</h2>
              <p className="text-muted mt-2 text-xs leading-5">
                Preview a new minimal package. Issuing it marks this package
                superseded without changing its content.
              </p>
              <form action={previewEvidenceAction} className="mt-4">
                <input
                  type="hidden"
                  name="obligationId"
                  value={evidence.obligationId}
                />
                <input
                  type="hidden"
                  name="template"
                  value="MINIMAL_PAYMENT_CONFIRMATION"
                />
                <input
                  type="hidden"
                  name="supersedesPackageId"
                  value={evidence.id}
                />
                <button className="button button-light">
                  Preview successor
                </button>
              </form>
            </section>
            <section className="card border-red-200 p-5">
              <h2 className="font-semibold">Revoke package</h2>
              <form
                action={revokeEvidenceAction.bind(null, evidence.id)}
                className="mt-4"
              >
                <label className="text-xs">
                  Reason
                  <textarea
                    name="reason"
                    required
                    minLength={5}
                    className="mt-2 min-h-24 w-full rounded-lg border p-3"
                  />
                </label>
                <button className="button mt-3">Revoke without deleting</button>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
