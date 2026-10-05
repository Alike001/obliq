import { z } from "zod";
import { parseMoneyInput } from "./money";
import type { ObligationState } from "./status";

export const obligationTypes = ["VENDOR_INVOICE", "CONTRACTOR_BILL"] as const;
export const obligationSourceKinds = ["MANUAL", "INVOICE_UPLOAD"] as const;
export type ObligationType = (typeof obligationTypes)[number];
export type ObligationSourceKind = (typeof obligationSourceKinds)[number];

export const obligationInputSchema = z.strictObject({
  vendorId: z.uuid(),
  type: z.enum(obligationTypes),
  sourceId: z.uuid().optional(),
  reference: z.string().trim().min(1).max(100),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/),
  amount: z.string().trim().min(1),
  dueDate: z.iso.date(),
  category: z.string().trim().max(80).optional(),
  description: z.string().trim().min(2).max(500),
});

export function validateObligationInput(input: unknown) {
  const parsed = obligationInputSchema.parse(input);
  return { ...parsed, ...parseMoneyInput(parsed.amount, parsed.currency) };
}

const phaseOneTransitions: Readonly<
  Record<string, readonly ObligationState[]>
> = {
  DRAFT: ["UNDER_REVIEW"],
  UNDER_REVIEW: [],
};

export function transitionPhaseOneObligation(
  current: ObligationState,
  next: ObligationState,
): ObligationState {
  if (!phaseOneTransitions[current]?.includes(next))
    throw new Error(
      `Phase 1 cannot transition obligation from ${current} to ${next}`,
    );
  return next;
}

export type DuplicateKind = "EXACT" | "POSSIBLE" | "NONE";
export interface DuplicateCandidate {
  id: string;
  vendorId: string;
  reference: string;
  currency: string;
  amountMinor: bigint;
  sourceHash?: string | null;
}
export type DuplicateInput = Omit<DuplicateCandidate, "id">;

export function normalizeReference(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function classifyDuplicate(
  input: DuplicateInput,
  candidate: DuplicateCandidate,
) {
  const sameVendor = input.vendorId === candidate.vendorId;
  const sameReference =
    normalizeReference(input.reference) ===
    normalizeReference(candidate.reference);
  const sameValue =
    input.currency === candidate.currency &&
    input.amountMinor === candidate.amountMinor;
  const sameDocument = Boolean(
    input.sourceHash &&
    candidate.sourceHash &&
    input.sourceHash === candidate.sourceHash,
  );
  if (sameDocument || (sameVendor && sameReference && sameValue))
    return {
      kind: "EXACT" as const,
      reasons: [sameDocument ? "DOCUMENT_HASH" : "VENDOR_REFERENCE_AMOUNT"],
    };
  const reasons = [
    sameVendor && sameReference ? "VENDOR_REFERENCE" : null,
    sameVendor && sameValue ? "VENDOR_AMOUNT" : null,
    sameReference && sameValue ? "REFERENCE_AMOUNT" : null,
  ].filter((reason): reason is string => reason !== null);
  return {
    kind: reasons.length ? ("POSSIBLE" as const) : ("NONE" as const),
    reasons,
  };
}
