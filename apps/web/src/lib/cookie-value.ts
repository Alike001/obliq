export function cookieValue(header: string | null, name: string) {
  if (!header || !name) return null;
  const prefix = `${name}=`;
  const encoded = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  if (!encoded) return null;
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}
