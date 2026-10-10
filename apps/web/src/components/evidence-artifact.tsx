import {
  evidenceFields,
  type EvidenceArtifact as EvidenceArtifactModel,
  type EvidenceFieldKey,
  type JsonValue,
} from "@obliq/evidence";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { StateTag } from "./state-tag";
import { stateLabel } from "./state-tone";

const provenanceLabels = {
  OBLIQ_BUSINESS_RECORD: "Obliq business record",
  OBLIQ_AUTHORIZATION_RECORD: "Obliq authorization record",
  ZCASH_RECONCILIATION: "Zcash reconciliation observation",
} as const;

export function EvidenceArtifact({
  artifact,
  contentHash,
  status,
  integrityValid,
}: {
  artifact: EvidenceArtifactModel;
  contentHash: string;
  status: "PREVIEW" | "ACTIVE" | "SUPERSEDED" | "REVOKED";
  integrityValid: boolean;
}) {
  return (
    <article className="card overflow-hidden">
      <header className="bg-sunken border-b p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Obliq financial evidence</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight">
              Payment evidence receipt
            </h2>
            <p className="text-muted mt-2 text-sm">
              Issued by {artifact.issuer.name} · version {artifact.version}
            </p>
            <p className="text-muted mt-1 text-xs">
              Artifact created {new Date(artifact.createdAt).toLocaleString()}
            </p>
          </div>
          <StateTag state={status} />
        </div>
      </header>
      {!integrityValid && (
        // On the receipt itself, so it travels with a print or a screenshot.
        <div className="bg-stop-bg text-stop flex items-start gap-3 border-b px-6 py-4 md:px-8">
          <span className="glyph glyph-stop mt-[0.3rem]" aria-hidden />
          <p className="text-sm font-semibold">
            Untrusted content. This receipt failed its integrity check, so
            nothing below may be used as proof of payment or of anything else.
          </p>
        </div>
      )}
      <div className="p-6 md:p-8">
        <h3 className="fact-label">
          Disclosed by the issuer ({artifact.disclosedFields.length}{" "}
          {artifact.disclosedFields.length === 1 ? "field" : "fields"})
        </h3>
        <dl className="mt-4 grid gap-x-8 gap-y-6 sm:grid-cols-2">
          {artifact.disclosedFields.map((field) => {
            const claim = artifact.claims[field];
            if (!claim) return null;
            return (
              <div key={field} className="border-b pb-5">
                <dt className="text-muted text-xs">
                  {evidenceFields[field].label}
                </dt>
                <dd className="mt-2 text-[0.9375rem] font-semibold break-words">
                  <ClaimValue field={field} value={claim.value} />
                </dd>
                <dd className="text-muted mt-2 text-xs leading-5">
                  Source: {provenanceLabels[claim.provenance]} ·{" "}
                  {stateLabel(claim.classification)}
                </dd>
              </div>
            );
          })}
        </dl>
        <div className="mt-8 grid gap-4 border-t pt-6 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-muted text-xs">Evidence identifier</p>
            <p className="mt-2 font-mono text-xs break-all">
              {artifact.evidenceId}
            </p>
            <p className="text-muted mt-4 text-xs">SHA-256 artifact hash</p>
            <p className="mt-2 font-mono text-xs break-all">{contentHash}</p>
          </div>
          <div
            className={`flex items-center gap-2 text-sm font-semibold ${integrityValid ? "" : "text-stop"}`}
          >
            {integrityValid ? (
              <CheckCircle2 className="text-clear" size={18} aria-hidden />
            ) : (
              <CircleAlert className="text-stop" size={18} aria-hidden />
            )}
            {integrityValid ? "Content hash matches" : "Integrity failure"}
          </div>
        </div>
        <p className="text-muted mt-7 text-xs leading-5">
          This is application-generated, integrity-protected financial evidence.
          It is not a zero-knowledge proof, an independent accounting
          attestation, or blockchain proof of human-entered business facts.
        </p>
      </div>
    </article>
  );
}

function ClaimValue({
  field,
  value,
}: {
  field: EvidenceFieldKey;
  value: JsonValue;
}) {
  if (field === "BUSINESS_AMOUNT" && isRecord(value))
    return `${scalar(value.currency)} ${minorUnits(scalar(value.minorUnits))}`;
  if (field === "ZEC_AMOUNT" && isRecord(value))
    return `${formatZatoshis(scalar(value.zatoshis))} ZEC`;
  if (field === "APPROVAL_SUMMARY" && Array.isArray(value))
    return (
      <ul className="space-y-1">
        {value.map((item, index) => (
          <li key={index}>{approvalText(item)}</li>
        ))}
      </ul>
    );
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (value === null) return "Not categorized";
  return <span className="font-mono text-xs">{JSON.stringify(value)}</span>;
}

function isRecord(value: JsonValue): value is { [key: string]: JsonValue } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function minorUnits(value: string) {
  const negative = value.startsWith("-");
  const digits = negative ? value.slice(1) : value;
  return `${negative ? "-" : ""}${digits.slice(0, -2) || "0"}.${digits.slice(-2).padStart(2, "0")}`;
}

function formatZatoshis(value: string) {
  return `${value.slice(0, -8) || "0"}.${value.slice(-8).padStart(8, "0")}`.replace(
    /\.?0+$/u,
    "",
  );
}

function approvalText(value: JsonValue) {
  if (!isRecord(value)) return "Approval recorded";
  return `${scalar(value.role)} — ${scalar(value.approvedCount)}/${scalar(value.requiredCount)} ${scalar(value.state)}`;
}

function scalar(value: JsonValue | undefined) {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
    ? String(value)
    : "—";
}
