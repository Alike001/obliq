export type CurrencyCode = string & { readonly __brand: "CurrencyCode" };
export type MinorUnits = bigint & { readonly __brand: "MinorUnits" };
export type Zatoshi = bigint & { readonly __brand: "Zatoshi" };

const currencyPattern = /^[A-Z]{3}$/;
const decimalPattern = /^(0|[1-9]\d*)(?:\.(\d+))?$/;
const postgresBigintMax = 9_223_372_036_854_775_807n;

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

export function parseMoneyInput(value: string, currency: string): Money {
  const code = currencyCode(currency);
  const match = decimalPattern.exec(value.trim());
  if (!match) throw new Error("Enter a non-negative decimal amount");
  const fraction = match[2] ?? "";
  if (fraction.length > 2)
    throw new Error("Amount has more than two decimal places");
  const whole = BigInt(match[1] ?? "0");
  const amount = whole * 100n + BigInt(fraction.padEnd(2, "0") || "0");
  if (amount > postgresBigintMax)
    throw new Error("Amount exceeds supported range");
  return { currency: code, amountMinor: minorUnits(amount) };
}

export function formatMinorUnits(value: bigint, currency: string): string {
  const code = currencyCode(currency);
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, "0");
  return `${code} ${whole.toLocaleString("en-US")}.${fraction}`;
}
