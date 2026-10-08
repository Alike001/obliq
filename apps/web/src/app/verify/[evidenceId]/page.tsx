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
import { Notice } from "@/components/notice";
import { getDatabase } from "@/lib/db";
import { rateLimitRequest, requestSubject } from "@/lib/request-security";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default async function VerifyEvidencePage({
  params,
}: {
  params: Promise<{ evidenceId: string }>;
}) {
  if (getRuntimeSecurityConfig().deploymentMode === "preview") notFound();
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
  const status = result?.evidence.status;
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
            <Notice
              tone="hold"
              title="Verification is temporarily unavailable"
              live
              className="mt-8"
            >
              Too many verification requests came from this connection. Nothing
              was checked and nothing is shown. Wait a minute, then open the
              link again.
            </Notice>
          ) : !result ? (
            <Notice
              tone="stop"
              title="No evidence at this link"
              live
              className="mt-8"
            >
              This verification identifier is invalid or does not correspond to
              an issued package. No organization data has been disclosed. Ask
              the sender for the link again; do not treat this as proof of
              anything.
            </Notice>
          ) : (
            <>
              {/* One verdict first: can this receipt be relied on today? */}
              {!result.integrityValid ? (
                <Notice
                  tone="stop"
                  title="Integrity check failed. Do not rely on this receipt"
                  live
                  className="mt-8"
                >
                  The content below does not match the hash recorded when it was
                  issued. Contact the issuer through a channel you already
                  trust.
                </Notice>
              ) : status === "REVOKED" ? (
                <Notice
                  tone="stop"
                  title="Revoked. Do not rely on this receipt"
                  live
                  className="mt-8"
                >
                  The issuer withdrew this package. Its content is shown for the
                  record only and is not current.
                </Notice>
              ) : status === "SUPERSEDED" ? (
                <Notice
                  tone="hold"
                  title="Superseded. A newer version replaces this receipt"
                  live
                  className="mt-8"
                >
                  The issuer replaced this package. Its content is shown for the
                  record only and is not current. Ask the issuer for the current
                  link.
                </Notice>
              ) : status === "ACTIVE" ? (
                <Notice
                  tone="done"
                  title="Current and intact"
                  live
                  className="mt-8"
                >
                  This is the issuer&apos;s current package, and its content
                  matches the hash recorded when it was issued. It shows only
                  the fields the issuer chose to disclose.
                </Notice>
              ) : (
                <Notice tone="hold" title="Not current" live className="mt-8">
                  This package is not the issuer&apos;s current evidence. Its
                  content is shown for the record only.
                </Notice>
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
              <p className="text-muted mt-3 max-w-[68ch] text-xs leading-5 print:hidden">
                The JSON file is the canonical artifact: the receipt above is
                drawn from it and adds nothing to it. PDF generation is not
                implemented; your browser&apos;s print command can print this
                page.
              </p>
            </>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
