import { parseRuntimeSecurityConfig } from "@obliq/security";

const config = parseRuntimeSecurityConfig(process.env);
process.stdout.write(
  `${JSON.stringify({
    status: "valid",
    deploymentMode: config.deploymentMode,
    authMode: config.authMode,
    storageMode: config.storageMode,
    rateLimitMode: config.rateLimitMode,
    network: config.network,
    publicNetworkStatus: config.publicNetworkStatus,
  })}\n`,
);
