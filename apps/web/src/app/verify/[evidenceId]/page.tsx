import {
  RateLimitExceededError,
  recordEvidenceAccess,
  verifyPublicEvidence,
} from "@obliq/database";
import { writeOperationalLog } from "@obliq/security";
import type { Metadata } from "next";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { EvidenceArtifact } from "@/components/evidence-artifact";
import { getDatabase } from "@/lib/db";
import { rateLimitRequest, requestSubject } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function VerifyEvidencePage({
  params,
}: {
  params: Promise<{ evidenceId: string }>;
}) {
  const { evidenceId } = await params;
  const subject = await requestSubject();
  let rateLimited = false;
  let result: Awaited<ReturnType<typeof verifyPublicEvidence>> = null;
  try {
    await rateLimitRequest("evidence:verify", subject, 60, 60);
    result = await verifyPublicEvidence(getDatabase(), evidenceId);
    if (result)
      await recordEvidenceAccess(getDatabase(), {
        organizationId: result.evidence.organizationId,
        evidencePackageId: result.evidence.id,
        action: "VERIFY",
        subjectFingerprint: subject,
        outcome: result.integrityValid
          ? result.evidence.status
          : "INTEGRITY_FAILURE",
      });
    else writeOperationalLog("warn", "evidence.verify.not_found", { subject });
  } catch (error) {
    if (error instanceof RateLimitExceededError) rateLimited = true;
    else throw error;
  }
  return (
    <main>
      <SiteHeader />
      <section className="page-wrap py-14 md:py-20">
        <div className="mx-auto max-w-4xl">
          <p className="eyebrow">External verification</p>
          <h1 className="mt-4 text-4xl font-medium tracking-tight">
            Controlled payment evidence
          </h1>
          {rateLimited ? (
            <div className="card mt-8 border-amber-300 p-8" role="status">
              <h2 className="font-semibold">Too many verification requests</h2>
              <p className="text-muted mt-3 text-sm leading-6">
                Wait before trying this verification link again.
              </p>
            </div>
          ) : !result ? (
            <div className="card mt-8 border-red-200 p-8">
              <h2 className="font-semibold">Evidence not found</h2>
              <p className="text-muted mt-3 text-sm leading-6">
                This verification identifier is invalid or does not correspond
                to an issued package. No organization data has been disclosed.
              </p>
            </div>
          ) : (
            <>
              {!result.integrityValid && (
                <div className="mt-8 rounded-lg border border-red-300 bg-red-50 p-5 text-sm font-semibold text-red-900">
                  Integrity verification failed. Do not rely on this artifact.
                </div>
              )}
              {result.evidence.status !== "ACTIVE" && (
                <div className="mt-8 rounded-lg border border-amber-300 bg-amber-50 p-5 text-sm text-amber-950">
                  This package is {result.evidence.status}. Historical content
                  remains visible for transparency, but it is not current.
                </div>
              )}
              <div className="mt-8">
                <EvidenceArtifact
                  artifact={result.evidence.artifactJson}
                  contentHash={result.evidence.artifactHash}
                  status={result.evidence.status}
                  integrityValid={result.integrityValid}
                />
              </div>
              <div className="mt-5 flex flex-wrap gap-3 print:hidden">
                <a
                  href={`/verify/${evidenceId}/artifact.json`}
                  className="button button-dark"
                >
                  Download canonical JSON
                </a>
              </div>
              <p className="text-muted mt-3 text-xs print:hidden">
                PDF generation is not implemented. The browser print control can
                render this verified receipt; JSON is the canonical artifact.
              </p>
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
