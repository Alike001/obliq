import {
  chmod,
  mkdtemp,
  readFile,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertPrivateRegularFile,
  writePrivateFileExclusive,
} from "./qualification-files";

describe("qualification evidence file safety", () => {
  it("accepts owner-only regular files and rejects permissive or linked input", async () => {
    const directory = await mkdtemp(join(tmpdir(), "obliq-qualification-"));
    const privateFile = join(directory, "private.json");
    const permissiveFile = join(directory, "permissive.json");
    const linkedFile = join(directory, "linked.json");
    await writeFile(privateFile, "{}", { mode: 0o600 });
    await writeFile(permissiveFile, "{}", { mode: 0o600 });
    await chmod(permissiveFile, 0o644);
    await symlink(privateFile, linkedFile);

    await expect(
      assertPrivateRegularFile(privateFile, "Private file"),
    ).resolves.toBeUndefined();
    await expect(
      assertPrivateRegularFile(permissiveFile, "Permissive file"),
    ).rejects.toThrow("mode 0600 or stricter");
    await expect(
      assertPrivateRegularFile(linkedFile, "Linked file"),
    ).rejects.toThrow("regular, non-symlink");
  });

  it("creates mode-0600 evidence once and never overwrites it", async () => {
    const directory = await mkdtemp(join(tmpdir(), "obliq-qualification-"));
    const filename = join(directory, "evidence.json");
    await writePrivateFileExclusive(filename, "first");

    expect((await stat(filename)).mode & 0o777).toBe(0o600);
    expect(await readFile(filename, "utf8")).toBe("first");
    await expect(
      writePrivateFileExclusive(filename, "second"),
    ).rejects.toMatchObject({ code: "EEXIST" });
    expect(await readFile(filename, "utf8")).toBe("first");
  });
});
