import type { PilotQuotaKind } from "@obliq/database";

const allowedPilotMutations = {
  "create-vendor": "vendor",
  "update-vendor": "mutation",
  "create-obligation": "obligation",
  "update-obligation": "mutation",
  "evaluate-controls": "mutation",
} as const satisfies Record<string, PilotQuotaKind>;

export function pilotQuotaForMutation(scope: string): PilotQuotaKind | null {
  return Object.prototype.hasOwnProperty.call(allowedPilotMutations, scope)
    ? allowedPilotMutations[scope as keyof typeof allowedPilotMutations]
    : null;
}
