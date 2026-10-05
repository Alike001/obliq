"use server";

import { DevelopmentFixtureExtractor } from "@obliq/ai";
import {
  ExactDuplicateError,
  addVendorDestination,
  createObligation,
  createSource,
  createVendor,
  createDefaultPolicy,
  createPolicyVersion,
  decideApproval,
  evaluateObligationControls,
  evaluateSettlementReadiness,
  resolveDuplicateFinding,
  updateObligation,
  verifyDestinationManually,
} from "@obliq/database";
import {
  LocalDocumentStorage,
  defaultMaxUploadBytes,
  validateInvoiceDocument,
} from "@obliq/storage";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolve } from "node:path";
import { getDatabase } from "@/lib/db";
import { getTenantContext } from "@/lib/session";
import { defaultPolicyConfig } from "@obliq/policy";
import { parseMoneyInput } from "@obliq/domain";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}
function optional(formData: FormData, name: string) {
  return field(formData, name).trim() || undefined;
}

export async function createVendorAction(formData: FormData) {
  const actor = await getTenantContext();
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
  const actor = await getTenantContext();
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
  const actor = await getTenantContext();
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
  return persistObligation(formData, sourceId);
}

export async function updateObligationAction(
  obligationId: string,
  formData: FormData,
) {
  const actor = await getTenantContext();
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
  const actor = await getTenantContext();
  const file = formData.get("invoice");
  if (!(file instanceof File)) throw new Error("Select an invoice file");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const maxBytes = Number(
    process.env.OBLIQ_MAX_UPLOAD_BYTES ?? defaultMaxUploadBytes,
  );
  const validated = validateInvoiceDocument(bytes, file.type, maxBytes);
  const storage = new LocalDocumentStorage(
    resolve(
      /* turbopackIgnore: true */ process.env.OBLIQ_UPLOAD_DIR ??
        ".data/uploads",
    ),
  );
  const stored = await storage.put({
    organizationId: actor.organizationId,
    bytes,
  });
  let sourceId: string;
  try {
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
      },
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
  const actor = await getTenantContext();
  await createDefaultPolicy(getDatabase(), actor);
  revalidatePath("/app/policies");
  redirect("/app/policies?created=1");
}

export async function createPolicyVersionAction(
  policyId: string,
  formData: FormData,
) {
  const actor = await getTenantContext();
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
  const actor = await getTenantContext();
  await evaluateObligationControls(getDatabase(), actor, obligationId);
  revalidatePath(`/app/obligations/${obligationId}`);
  redirect(`/app/obligations/${obligationId}?controls=evaluated`);
}

export async function approvalDecisionAction(
  requirementId: string,
  obligationId: string,
  formData: FormData,
) {
  const actor = await getTenantContext();
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
  const actor = await getTenantContext();
  await evaluateSettlementReadiness(getDatabase(), actor, obligationId);
  revalidatePath(`/app/obligations/${obligationId}`);
  redirect(`/app/obligations/${obligationId}?readiness=evaluated`);
}

export async function verifyDestinationAction(
  vendorId: string,
  destinationId: string,
  formData: FormData,
) {
  const actor = await getTenantContext();
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
  const actor = await getTenantContext();
  await resolveDuplicateFinding(
    getDatabase(),
    actor,
    findingId,
    field(formData, "note"),
  );
  revalidatePath(`/app/obligations/${obligationId}`);
  redirect(`/app/obligations/${obligationId}?duplicate=resolved`);
}
