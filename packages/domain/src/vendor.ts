import { z } from "zod";

export const vendorInputSchema = z.strictObject({
  legalName: z.string().trim().min(2).max(160),
  displayName: z.string().trim().min(2).max(100),
  category: z.string().trim().max(80).optional(),
  contactName: z.string().trim().max(100).optional(),
  contactEmail: z.email().optional(),
});

export const destinationInputSchema = z.strictObject({
  network: z.literal("ZCASH"),
  receiver: z.string().trim().min(20).max(512),
});

export type VendorInput = z.infer<typeof vendorInputSchema>;
export type DestinationInput = z.infer<typeof destinationInputSchema>;
