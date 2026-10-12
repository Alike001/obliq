import type { PreviewRequest } from "./public-preview";

const publicGetPaths = new Set([
  "/",
  "/demo",
  "/feedback",
  "/health/live",
  "/health/ready",
  "/icon.svg",
  "/pilot",
  "/proof",
  "/robots.txt",
  "/security",
]);

const pilotMutationPaths = new Set([
  "/pilot/exit",
  "/pilot/reset",
  "/pilot/start",
]);

export function isPublicPilotRequestAllowed(request: PreviewRequest) {
  if (request.pathname.startsWith("/_next/"))
    return request.method === "GET" || request.method === "HEAD";
  if (request.method === "GET" || request.method === "HEAD") {
    if (
      request.pathname === "/docs" ||
      request.pathname.startsWith("/docs/") ||
      request.pathname === "/app" ||
      request.pathname.startsWith("/app/")
    )
      return true;
    return publicGetPaths.has(request.pathname);
  }
  if (request.method === "POST") {
    if (pilotMutationPaths.has(request.pathname)) return true;
    return (
      request.serverAction &&
      (request.pathname === "/app" || request.pathname.startsWith("/app/"))
    );
  }
  return false;
}
