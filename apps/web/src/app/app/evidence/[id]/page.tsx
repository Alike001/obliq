import { verifyEvidenceArtifact } from "@obliq/evidence";
import { getEvidencePackage } from "@obliq/database";
import { notFound } from "next/navigation";
import { EvidenceArtifact } from "@/components/evidence-artifact";
import { Notice } from "@/components/notice";
import { Field, Textarea } from "@/components/finance-form";
import { BackLink } from "@/components/record";
import { stateLabel } from "@/components/state-tone";
import { SubmitButton } from "@/components/submit-button";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { previewEvidenceAction, revokeEvidenceAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EvidenceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ issued?: string; revoked?: string }>;
}) {
  const { id } = await params;
  const notice = await searchParams;
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
        <BackLink href="/app/evidence" label="Evidence" />
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Issued package</p>
            <h1 className="mt-3 text-3xl font-medium">Controlled evidence</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="button button-light"
              href={`/verify/${evidence.publicId}`}
              target="_blank"
              rel="noreferrer"
            >
              Open recipient view
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            {/* The JSON route refuses a package that fails its check. */}
            {valid && (
              <a
                className="button button-dark"
                href={`/verify/${evidence.publicId}/artifact.json`}
              >
                Download JSON
              </a>
            )}
          </div>
        </div>
        {notice.issued && evidence.status === "ACTIVE" && (
          <Notice tone="done" title="Evidence issued" live className="mt-6">
            Its content and hash are now frozen. Share the link below only with
            the intended recipient.
          </Notice>
        )}
        {notice.revoked && evidence.status === "REVOKED" && (
          <Notice tone="stop" title="Package revoked" live className="mt-6">
            The recipient link now shows it as revoked. The package was not
            deleted and its content is unchanged.
          </Notice>
        )}
        {!valid && (
          <Notice
            tone="stop"
            title="Integrity check failed"
            live
            className="mt-6"
          >
            The stored content no longer matches its hash. Treat it as
            untrusted: do not share this package, rely on it or use it as proof.
            The JSON download is refused while the check fails.
            The stored content no longer matches its hash. Do not share this
            package or rely on it.
          </Notice>
        )}
        <div className="mt-7">
          <EvidenceArtifact
            artifact={evidence.artifactJson}
            contentHash={evidence.artifactHash}
            status={evidence.status}
            integrityValid={valid}
          />
        </div>
        {evidence.status !== "ACTIVE" && (
          <Notice
            tone={evidence.status === "REVOKED" ? "stop" : "info"}
            title={`This package is ${stateLabel(evidence.status).toLowerCase()}`}
            className="mt-5"
          >
            {evidence.statusChangedAt &&
              `Changed ${evidence.statusChangedAt.toLocaleString()}. `}
            {evidence.statusReason &&
              `Internal reason, not shown to the recipient: ${evidence.statusReason}`}
          </Notice>
        )}
        <section className="card mt-5 p-5">
          <h2 className="font-semibold">Share safely</h2>
          <p className="text-muted mt-2 text-xs leading-5">
            Anyone with this high-entropy link can see only the fields embedded
            in this immutable package. Treat the link as confidential recipient
            material.
          </p>
          <code className="code-block mt-4 text-xs!" tabIndex={0}>
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
                <SubmitButton
                  className="button button-light"
                  pendingLabel="Building preview…"
                >
                  Preview successor
                </SubmitButton>
              </form>
            </section>
            <section className="card p-5">
              <h2 className="font-semibold">Revoke package</h2>
              <p className="text-muted mt-2 text-xs leading-5">
                The recipient link will show it as revoked. This cannot be
                undone; issue a new package if it was revoked by mistake.
              </p>
              <form
                action={revokeEvidenceAction.bind(null, evidence.id)}
                className="mt-4"
              >
                <Field
                  label="Reason"
                  hint="Kept internally. At least 5 characters."
                >
                  <Textarea name="reason" required minLength={5} />
                </Field>
                <SubmitButton
                  className="button button-light mt-3"
                  pendingLabel="Revoking…"
                >
                  Revoke without deleting
                </SubmitButton>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
