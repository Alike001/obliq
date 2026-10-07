export type PreviewRequest = {
  method: string;
  pathname: string;
  serverAction: boolean;
};

const exactPublicPaths = new Set([
  "/",
  "/health/live",
  "/health/ready",
  "/icon.svg",
  "/proof",
  "/robots.txt",
  "/security",
]);

export function isPublicPreviewRequestAllowed(request: PreviewRequest) {
  if (request.serverAction) return false;
  if (request.method !== "GET" && request.method !== "HEAD") return false;
  if (request.pathname.startsWith("/_next/")) return true;
  if (request.pathname === "/docs" || request.pathname.startsWith("/docs/"))
    return true;
  return exactPublicPaths.has(request.pathname);
}
