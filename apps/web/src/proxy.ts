import { parseRuntimeSecurityConfig } from "@obliq/security";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isPublicPreviewRequestAllowed } from "./lib/public-preview";

function unavailable(status: 404 | 503, message: string) {
  return new NextResponse(message, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export function proxy(request: NextRequest) {
  let runtime: ReturnType<typeof parseRuntimeSecurityConfig>;
  try {
    runtime = parseRuntimeSecurityConfig(process.env);
  } catch {
    return unavailable(503, "Obliq runtime configuration is unavailable.");
  }

  if (runtime.deploymentMode !== "preview") return NextResponse.next();

  const allowed = isPublicPreviewRequestAllowed({
    method: request.method,
    pathname: request.nextUrl.pathname,
    serverAction: request.headers.has("next-action"),
  });
  if (!allowed)
    return unavailable(
      404,
      "This financial operation is unavailable in the public preview.",
    );
  return NextResponse.next();
}

export const config = { matcher: "/:path*" };
