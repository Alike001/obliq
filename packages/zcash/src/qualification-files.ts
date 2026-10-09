import { lstat, open } from "node:fs/promises";

export async function assertPrivateRegularFile(
  filename: string,
  label: string,
) {
  const file = await lstat(filename);
  if (!file.isFile() || file.isSymbolicLink())
    throw new Error(`${label} must be a regular, non-symlink file`);
  if ((file.mode & 0o077) !== 0)
    throw new Error(`${label} must have mode 0600 or stricter`);
}

export async function writePrivateFileExclusive(
  filename: string,
  value: string,
) {
  const file = await open(filename, "wx", 0o600);
  try {
    await file.writeFile(value, { encoding: "utf8" });
    await file.sync();
  } finally {
    await file.close();
  }
}
