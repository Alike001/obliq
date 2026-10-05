export type CurrencyCode = string & { readonly __brand: "CurrencyCode" };
export type MinorUnits = bigint & { readonly __brand: "MinorUnits" };
export type Zatoshi = bigint & { readonly __brand: "Zatoshi" };

const currencyPattern = /^[A-Z]{3}$/;

export function currencyCode(value: string): CurrencyCode {
  if (!currencyPattern.test(value))
    throw new Error("Currency must be an ISO-style three-letter code");
  return value as CurrencyCode;
}

export function minorUnits(value: bigint): MinorUnits {
  if (value < 0n) throw new Error("Money cannot be negative");
  return value as MinorUnits;
}

export function zatoshi(value: bigint): Zatoshi {
  if (value < 0n) throw new Error("Zatoshi amount cannot be negative");
  return value as Zatoshi;
}

export interface Money {
  readonly currency: CurrencyCode;
  readonly amountMinor: MinorUnits;
}

export function money(currency: string, amountMinor: bigint): Money {
  return {
    currency: currencyCode(currency),
    amountMinor: minorUnits(amountMinor),
  };
}
