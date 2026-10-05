export interface AiSuggestion<T> {
  readonly value: T;
  readonly confidenceBasisPoints: number;
  readonly requiresHumanReview: true;
}

export type SpendingAuthority = never;

export interface SigningHandoff {
  readonly obligationId: string;
  readonly settlementIntentId: string;
  readonly destinationFingerprint: string;
  readonly zatoshiAmount: Zatoshi;
  readonly expiresAt: Date;
}

import type { Zatoshi } from "./money";
