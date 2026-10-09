"use server";

import { DevelopmentFixtureExtractor } from "@obliq/ai";
import {
  ExactDuplicateError,
  addVendorDestination,
  createObligation,
  createSource,
  createVendor,
  createDefaultPolicy,
  changeEvidenceStatus,
  createPolicyVersion,
  createControlledRegtestQuote,
  decideApproval,
  evaluateObligationControls,
  evaluateSettlementReadiness,
  prepareSettlementIntent,
  previewEvidence,
  issueEvidence,
  recordExternalBroadcast,
  recordExternalSigning,
  requestExternalSignature,
  resolveDuplicateFinding,
  updateObligation,
  verifyDestinationManually,
} from "@obliq/database";
import {
  DevelopmentNoopScanner,
  HttpDocumentScanner,
  LocalDocumentStorage,
  S3PrivateDocumentStorage,
  defaultMaxUploadBytes,
  validateInvoiceDocument,
} from "@obliq/storage";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolve } from "node:path";
import { getDatabase } from "@/lib/db";
import { getTenantContext as resolveTenantContext } from "@/lib/session";
import { rateLimitRequest } from "@/lib/request-security";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";
import { defaultPolicyConfig } from "@obliq/policy";
import { parseMoneyInput } from "@obliq/domain";
import {
  boundedToken,
  opaqueId,
  positiveInteger,
} from "@/lib/input-validation";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
function optional(formData: FormData, name: string) {
  return field(formData, name).trim() || undefined;
}

async function mutationActor(
  scope = "mutation",
  limit = 120,
  windowSeconds = 60,
) {
  if (getRuntimeSecurityConfig().deploymentMode === "preview")
    throw new Error("Financial operations are unavailable in public preview");
  const actor = await resolveTenantContext();
  await rateLimitRequest(
    `app:${scope}`,
    `${actor.organizationId}:${actor.userId}`,
    limit,
    windowSeconds,
  );
  return actor;
}

export async function createVendorAction(formData: FormData) {
  const actor = await mutationActor();
  const vendor = await createVendor(getDatabase(), actor, {
    legalName: field(formData, "legalName"),
    displayName: field(formData, "displayName"),
    category: optional(formData, "category"),
    contactName: optional(formData, "contactName"),
    contactEmail: optional(formData, "contactEmail"),
  });
  revalidatePath("/app/vendors");
  redirect(`/app/vendors/${vendor.id}?created=1`);
}

export async function addDestinationAction(
  vendorId: string,
  formData: FormData,
) {
  opaqueId(vendorId, "vendor identifier");
  const actor = await mutationActor();
  const destination = await addVendorDestination(
    getDatabase(),
    actor,
    vendorId,
    {
      network: "ZCASH",
      receiver: field(formData, "receiver"),
    },
  );
  if (!destination) throw new Error("Vendor not found");
  revalidatePath(`/app/vendors/${vendorId}`);
  redirect(`/app/vendors/${vendorId}?destination=added`);
}

async function persistObligation(formData: FormData, sourceId?: string) {
  if (sourceId) opaqueId(sourceId, "source identifier");
  const actor = await mutationActor();
  try {
    const obligation = await createObligation(getDatabase(), actor, {
      vendorId: field(formData, "vendorId"),
      type: field(formData, "type"),
      sourceId,
      reference: field(formData, "reference"),
      currency: field(formData, "currency"),
      amount: field(formData, "amount"),
      dueDate: field(formData, "dueDate"),
      category: optional(formData, "category"),
      description: field(formData, "description"),
    });
    revalidatePath("/app");
    revalidatePath("/app/obligations");
    redirect(`/app/obligations/${obligation.id}?created=1`);
  } catch (error) {
    if (error instanceof ExactDuplicateError)
      redirect(`/app/obligations/${error.candidateId}?duplicate=blocked`);
    throw error;
  }
}

export async function createManualObligationAction(formData: FormData) {
  return persistObligation(formData);
}

export async function createReviewedObligationAction(
  sourceId: string,
  formData: FormData,
) {
  opaqueId(sourceId, "source identifier");
  return persistObligation(formData, sourceId);
}

export async function updateObligationAction(
  obligationId: string,
  formData: FormData,
) {
  opaqueId(obligationId, "obligation identifier");
  const actor = await mutationActor();
  try {
    const obligation = await updateObligation(
      getDatabase(),
      actor,
      obligationId,
      {
        vendorId: field(formData, "vendorId"),
        type: field(formData, "type"),
        reference: field(formData, "reference"),
        currency: field(formData, "currency"),
        amount: field(formData, "amount"),
        dueDate: field(formData, "dueDate"),
        category: optional(formData, "category"),
        description: field(formData, "description"),
      },
    );
    if (!obligation) throw new Error("Obligation not found");
    revalidatePath(`/app/obligations/${obligationId}`);
    redirect(`/app/obligations/${obligationId}?updated=1`);
  } catch (error) {
    if (error instanceof ExactDuplicateError)
      redirect(`/app/obligations/${error.candidateId}?duplicate=blocked`);
    throw error;
  }
}

export async function uploadInvoiceAction(formData: FormData) {
  const actor = await mutationActor("invoice-upload", 10, 3600);
  const file = formData.get("invoice");
  if (!(file instanceof File)) throw new Error("Select an invoice file");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const maxBytes = Number(
    process.env.OBLIQ_MAX_UPLOAD_BYTES ?? defaultMaxUploadBytes,
  );
  const validated = validateInvoiceDocument(bytes, file.type, maxBytes);
  const runtime = getRuntimeSecurityConfig();
  const storage =
    runtime.storageMode === "s3-private"
      ? new S3PrivateDocumentStorage({
          bucket: process.env.OBLIQ_STORAGE_BUCKET ?? "",
          region: process.env.OBLIQ_STORAGE_REGION ?? "",
          ...(process.env.OBLIQ_STORAGE_ENDPOINT
            ? { endpoint: process.env.OBLIQ_STORAGE_ENDPOINT }
            : {}),
          ...(process.env.OBLIQ_STORAGE_KMS_KEY_ID
            ? { kmsKeyId: process.env.OBLIQ_STORAGE_KMS_KEY_ID }
            : {}),
        })
      : new LocalDocumentStorage(
          resolve(
            /* turbopackIgnore: true */ process.env.OBLIQ_UPLOAD_DIR ??
              ".data/uploads",
          ),
        );
  const scanner =
    runtime.storageMode === "s3-private"
      ? new HttpDocumentScanner(
          process.env.OBLIQ_DOCUMENT_SCANNER_URL ?? "",
          process.env.OBLIQ_DOCUMENT_SCANNER_TOKEN ?? "",
        )
      : new DevelopmentNoopScanner();
  const stored = await storage.put({
    organizationId: actor.organizationId,
    bytes,
    mediaType: validated.mediaType,
    contentHash: validated.contentHash,
  });
  let sourceId: string;
  try {
    const scan = await scanner.scan({
      storageRef: stored.storageRef,
      contentHash: validated.contentHash,
      mediaType: validated.mediaType,
    });
    if (scan.status === "REJECTED")
      throw new Error("Invoice document was rejected by security scanning");
    if (runtime.deploymentMode === "production" && scan.status !== "CLEAN")
      throw new Error("Production invoice requires a clean scan result");
    const extraction = await new DevelopmentFixtureExtractor().extract({
      originalFilename: file.name,
      mediaType: validated.mediaType,
      contentHash: validated.contentHash,
    });
    const source = await createSource(getDatabase(), actor, {
      kind: "INVOICE_UPLOAD",
      storageRef: stored.storageRef,
      contentHash: validated.contentHash,
      metadata: {
        originalFilename: file.name.slice(0, 255),
        mediaType: validated.mediaType,
        sizeBytes: bytes.length,
        scanProvider: scan.scanner,
      },
      storageMode:
        runtime.storageMode === "s3-private"
          ? "S3_PRIVATE"
          : "LOCAL_DEVELOPMENT",
      scanStatus: scan.status,
      quarantinedAt: new Date(),
      ...(scan.status === "CLEAN" ? { scannedAt: scan.scannedAt } : {}),
      retentionUntil: new Date(Date.now() + 90 * 24 * 60 * 60_000),
      extraction: {
        provider: extraction.provider,
        mode: extraction.mode,
        status: "COMPLETED",
        result: extraction,
      },
    });
    sourceId = source.id;
  } catch (error) {
    await storage.remove(stored.storageRef);
    throw error;
  }
  redirect(`/app/obligations/review/${sourceId}`);
}

export async function createDefaultPolicyAction() {
  const actor = await mutationActor();
  await createDefaultPolicy(getDatabase(), actor);
  revalidatePath("/app/policies");
  redirect("/app/policies?created=1");
}

export async function createPolicyVersionAction(
  policyId: string,
  formData: FormData,
) {
  opaqueId(policyId, "policy identifier");
  const actor = await mutationActor();
  const currency = field(formData, "currency").toUpperCase();
  const lower = parseMoneyInput(field(formData, "lowerThreshold"), currency);
  const upper = parseMoneyInput(field(formData, "upperThreshold"), currency);
  await createPolicyVersion(getDatabase(), actor, policyId, {
    ...defaultPolicyConfig,
    currency,
    tiers: [
      {
        upperBoundMinor: lower.amountMinor.toString(),
        label: `Under ${currency} ${field(formData, "lowerThreshold")}`,
        requirements: [{ role: "FINANCE", count: 1, prohibitCreator: false }],
      },
      {
        upperBoundMinor: upper.amountMinor.toString(),
        label: `${currency} ${field(formData, "lowerThreshold")}–${field(formData, "upperThreshold")}`,
        requirements: [
          { role: "FINANCE", count: 1, prohibitCreator: false },
          { role: "TREASURY", count: 1, prohibitCreator: true },
        ],
      },
      {
        label: `Above ${currency} ${field(formData, "upperThreshold")}`,
        requirements: [{ role: "TREASURY", count: 2, prohibitCreator: true }],
      },
    ],
  });
  revalidatePath("/app/policies");
  redirect("/app/policies?version=created");
}

export async function evaluateControlsAction(obligationId: string) {
  opaqueId(obligationId, "obligation identifier");
  const actor = await mutationActor();
  await evaluateObligationControls(getDatabase(), actor, obligationId);
  revalidatePath(`/app/obligations/${obligationId}`);
  redirect(`/app/obligations/${obligationId}?controls=evaluated`);
}

export async function approvalDecisionAction(
  requirementId: string,
  obligationId: string,
  formData: FormData,
) {
  opaqueId(requirementId, "approval requirement identifier");
  opaqueId(obligationId, "obligation identifier");
  const actor = await mutationActor();
  const decision = field(formData, "decision");
  if (decision !== "APPROVE" && decision !== "REJECT")
    throw new Error("Invalid approval decision");
  await decideApproval(
    getDatabase(),
    actor,
    requirementId,
    decision,
    optional(formData, "note"),
  );
  revalidatePath("/app/approvals");
  revalidatePath(`/app/obligations/${obligationId}`);
  redirect(`/app/obligations/${obligationId}?approval=recorded`);
}

export async function readinessAction(obligationId: string) {
  opaqueId(obligationId, "obligation identifier");
  const actor = await mutationActor();
  await evaluateSettlementReadiness(getDatabase(), actor, obligationId);
  revalidatePath(`/app/obligations/${obligationId}`);
  redirect(`/app/obligations/${obligationId}?readiness=evaluated`);
}

export async function verifyDestinationAction(
  vendorId: string,
  destinationId: string,
  formData: FormData,
) {
  opaqueId(vendorId, "vendor identifier");
  opaqueId(destinationId, "destination identifier");
  const actor = await mutationActor();
  await verifyDestinationManually(
    getDatabase(),
    actor,
    destinationId,
    field(formData, "method"),
    field(formData, "note"),
  );
  revalidatePath(`/app/vendors/${vendorId}`);
  redirect(`/app/vendors/${vendorId}?verified=1`);
}

export async function resolveDuplicateAction(
  obligationId: string,
  findingId: string,
  formData: FormData,
) {
  opaqueId(obligationId, "obligation identifier");
  opaqueId(findingId, "duplicate finding identifier");
  const actor = await mutationActor();
  await resolveDuplicateFinding(
    getDatabase(),
    actor,
    findingId,
    field(formData, "note"),
  );
  revalidatePath(`/app/obligations/${obligationId}`);
  redirect(`/app/obligations/${obligationId}?duplicate=resolved`);
}

export async function createSettlementIntentAction(
  obligationId: string,
  formData: FormData,
) {
  opaqueId(obligationId, "obligation identifier");
  const actor = await mutationActor();
  const zatoshiAmount = positiveInteger(
    field(formData, "zatoshiAmount"),
    "zatoshi amount",
  );
  const idempotencyKey = boundedToken(
    field(formData, "idempotencyKey"),
    "idempotency key",
  );
  const quote = await createControlledRegtestQuote(getDatabase(), actor, {
    obligationId,
    zatoshiAmount,
    idempotencyKey,
  });
  const intent = await prepareSettlementIntent(getDatabase(), actor, {
    quoteId: quote.id,
    idempotencyKey: `${idempotencyKey}:intent`,
  });
  if (!intent) throw new Error("Settlement intent could not be prepared");
  revalidatePath("/app/settlements");
  redirect(`/app/settlements?prepared=${intent.id}`);
}

export async function requestExternalSignatureAction(
  settlementId: string,
  formData: FormData,
) {
  opaqueId(settlementId, "settlement identifier");
  const actor = await mutationActor();
  await requestExternalSignature(
    getDatabase(),
    actor,
    settlementId,
    boundedToken(field(formData, "signerRequestId"), "signer request"),
  );
  revalidatePath(`/app/settlements/${settlementId}`);
  redirect(`/app/settlements/${settlementId}?signing=requested`);
}

export async function recordSigningReceiptAction(
  settlementId: string,
  signerRequestId: string,
  formData: FormData,
) {
  opaqueId(settlementId, "settlement identifier");
  signerRequestId = boundedToken(signerRequestId, "signer request");
  const actor = await mutationActor();
  await recordExternalSigning(getDatabase(), actor, {
    settlementId,
    signerRequestId,
    outcome: "AUTHORIZED",
    signerType: "ZALLET_PCZT",
    signerVersion: boundedToken(
      field(formData, "signerVersion"),
      "signer version",
      64,
    ),
    networkFeeZat: positiveInteger(
      field(formData, "networkFeeZat"),
      "network fee",
    ),
    txid: field(formData, "txid").toLowerCase(),
    signedTxHash: field(formData, "signedTxHash").toLowerCase(),
  });
  revalidatePath(`/app/settlements/${settlementId}`);
  redirect(`/app/settlements/${settlementId}?signing=recorded`);
}

export async function recordSigningFailureAction(
  settlementId: string,
  signerRequestId: string,
  formData: FormData,
) {
  opaqueId(settlementId, "settlement identifier");
  signerRequestId = boundedToken(signerRequestId, "signer request");
  const actor = await mutationActor();
  const outcome = field(formData, "outcome");
  if (
    outcome !== "REJECTED" &&
    outcome !== "UNAVAILABLE" &&
    outcome !== "FAILED"
  )
    throw new Error("Invalid signing outcome");
  const errorCode = optional(formData, "errorCode");
  await recordExternalSigning(getDatabase(), actor, {
    settlementId,
    signerRequestId,
    outcome,
    ...(errorCode ? { errorCode } : {}),
  });
  revalidatePath(`/app/settlements/${settlementId}`);
  redirect(`/app/settlements/${settlementId}?signing=closed`);
}

export async function recordBroadcastReceiptAction(
  settlementId: string,
  formData: FormData,
) {
  opaqueId(settlementId, "settlement identifier");
  const actor = await mutationActor();
  const outcome = field(formData, "outcome");
  if (outcome !== "BROADCAST" && outcome !== "UNKNOWN" && outcome !== "FAILED")
    throw new Error("Invalid broadcast outcome");
  const errorCode = optional(formData, "errorCode");
  await recordExternalBroadcast(getDatabase(), actor, {
    settlementId,
    broadcastRequestId: boundedToken(
      field(formData, "broadcastRequestId"),
      "broadcast request",
    ),
    txid: field(formData, "txid").toLowerCase(),
    outcome,
    ...(errorCode ? { errorCode } : {}),
  });
  revalidatePath(`/app/settlements/${settlementId}`);
  redirect(`/app/settlements/${settlementId}?broadcast=recorded`);
}

export async function previewEvidenceAction(formData: FormData) {
  const actor = await mutationActor();
  const template = field(formData, "template");
  if (
    template !== "MINIMAL_PAYMENT_CONFIRMATION" &&
    template !== "VENDOR_RECEIPT" &&
    template !== "ACCOUNTANT_EVIDENCE"
  )
    throw new Error("Invalid evidence template");
  const disclosedFields = formData
    .getAll("disclosedFields")
    .filter((value): value is string => typeof value === "string");
  const supersedesPackageId = optional(formData, "supersedesPackageId");
  const preview = await previewEvidence(getDatabase(), actor, {
    obligationId: field(formData, "obligationId"),
    template,
    ...(disclosedFields.length > 0 ? { disclosedFields } : {}),
    ...(supersedesPackageId ? { supersedesPackageId } : {}),
  });
  redirect(`/app/evidence/preview/${preview.id}`);
}

export async function issueEvidenceAction(previewId: string) {
  opaqueId(previewId, "evidence preview identifier");
  const actor = await mutationActor();
  const evidence = await issueEvidence(getDatabase(), actor, previewId);
  if (!evidence) throw new Error("Evidence preview is unavailable");
  revalidatePath("/app/evidence");
  redirect(`/app/evidence/${evidence.id}?issued=1`);
}

export async function revokeEvidenceAction(
  evidenceId: string,
  formData: FormData,
) {
  opaqueId(evidenceId, "evidence identifier");
  const actor = await mutationActor();
  const evidence = await changeEvidenceStatus(
    getDatabase(),
    actor,
    evidenceId,
    field(formData, "reason"),
  );
  if (!evidence) throw new Error("Active evidence package is unavailable");
  revalidatePath(`/app/evidence/${evidenceId}`);
  redirect(`/app/evidence/${evidenceId}?revoked=1`);
}
