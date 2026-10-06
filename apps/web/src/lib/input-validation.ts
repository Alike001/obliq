const opaqueIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function opaqueId(value: string, label = "identifier") {
  if (!opaqueIdPattern.test(value)) throw new Error(`Invalid ${label}`);
  return value;
}

export function boundedToken(value: string, label: string, max = 128) {
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.length > max ||
    /[\u0000-\u001f\u007f]/u.test(normalized)
  )
    throw new Error(`Invalid ${label}`);
  return normalized;
}

export function positiveInteger(value: string, label: string) {
  if (!/^[1-9][0-9]*$/u.test(value)) throw new Error(`Invalid ${label}`);
  const amount = BigInt(value);
  if (amount > 2_100_000_000_000_000n) throw new Error(`Invalid ${label}`);
  return amount;
}
