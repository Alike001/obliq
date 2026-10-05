import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);
const ignored = new Set(["package-lock.json", "scripts/check-secrets.mjs"]);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\b(?:seed phrase|spending key|viewing key)\s*[=:]\s*["'][^"']{8,}/i,
  /\b(?:api[_-]?key|secret|password)\s*[=:]\s*["'][^"']{12,}/i,
];
const findings = [];
for (const file of tracked) {
  if (ignored.has(file) || file.startsWith("obliq-context/")) continue;
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (patterns.some((pattern) => pattern.test(content))) findings.push(file);
}
if (findings.length) {
  console.error(`Potential committed secrets found in: ${findings.join(", ")}`);
  process.exit(1);
}
console.log(
  `Secret-pattern scan passed (${tracked.length} tracked files inspected).`,
);
