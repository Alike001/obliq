import { checkDatabaseConnection } from "@obliq/database";
import { getDatabase } from "@/lib/db";
import { getRuntimeSecurityConfig } from "@/lib/runtime-config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const runtime = getRuntimeSecurityConfig();
    if (runtime.deploymentMode === "preview")
      return Response.json(
        {
          status: "ready",
          deploymentMode: "preview",
          database: "disabled",
          authMode: runtime.authMode,
          storageMode: runtime.storageMode,
          rateLimitMode: runtime.rateLimitMode,
          network: runtime.network,
          observer: "disabled",
          publicNetworkStatus: runtime.publicNetworkStatus,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    await checkDatabaseConnection(getDatabase());
    return Response.json(
      {
        status: "ready",
        authMode: runtime.authMode,
        storageMode: runtime.storageMode,
        rateLimitMode: runtime.rateLimitMode,
        network: runtime.network,
        publicNetworkStatus: runtime.publicNetworkStatus,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
