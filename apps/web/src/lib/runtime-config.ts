import "server-only";

import { parseRuntimeSecurityConfig } from "@obliq/security";

let cached: ReturnType<typeof parseRuntimeSecurityConfig> | undefined;

export function getRuntimeSecurityConfig() {
  cached ??= parseRuntimeSecurityConfig(process.env);
  return cached;
}
