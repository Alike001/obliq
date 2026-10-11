import { timingSafeEqual, randomUUID } from "node:crypto";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";

type StoredMessage = {
  providerReference: string;
  acceptedAt: string;
  message: unknown;
};

const host = "127.0.0.1";
const port = Number.parseInt(process.env.OBLIQ_DEV_MAIL_PORT ?? "4317", 10);
const configuredToken = process.env.OBLIQ_DEV_MAIL_TOKEN;
if (!configuredToken || configuredToken.length < 20)
  throw new Error("OBLIQ_DEV_MAIL_TOKEN must contain at least 20 characters");
const token = configuredToken;
if (!Number.isInteger(port) || port < 1024 || port > 65_535)
  throw new Error("OBLIQ_DEV_MAIL_PORT is invalid");

const messages: StoredMessage[] = [];

function authorized(request: IncomingMessage) {
  const provided =
    request.headers.authorization?.replace(/^Bearer /u, "") ?? "";
  const expectedBytes = Buffer.from(token);
  const providedBytes = Buffer.from(provided);
  return (
    providedBytes.length === expectedBytes.length &&
    timingSafeEqual(providedBytes, expectedBytes)
  );
}

function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage) {
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += value.length;
    if (bytes > 16_384) throw new Error("body too large");
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function validMessage(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.to !== "string" || !record.to.includes("@")) return false;
  if (record.kind === "INVITATION")
    return (
      Object.keys(record).length === 3 &&
      typeof record.invitationUrl === "string" &&
      record.invitationUrl.includes("#token=")
    );
  return (
    record.kind === "VERIFICATION_CODE" &&
    Object.keys(record).length === 3 &&
    typeof record.code === "string" &&
    /^\d{6}$/u.test(record.code)
  );
}

async function handle(request: IncomingMessage, response: ServerResponse) {
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);
  if (request.method === "GET" && url.pathname === "/health")
    return json(response, 200, { status: "ready", mode: "development-memory" });
  if (!authorized(request))
    return json(response, 401, { error: "UNAUTHORIZED" });

  if (request.method === "POST" && url.pathname === "/recipient") {
    try {
      const message = await readBody(request);
      if (!validMessage(message))
        return json(response, 422, { error: "INVALID_MESSAGE" });
      const providerReference = `dev:${randomUUID()}`;
      messages.push({
        providerReference,
        acceptedAt: new Date().toISOString(),
        message,
      });
      if (messages.length > 100) messages.shift();
      return json(response, 202, { accepted: true, providerReference });
    } catch {
      return json(response, 400, { error: "INVALID_MESSAGE" });
    }
  }
  if (request.method === "GET" && url.pathname === "/messages") {
    const to = url.searchParams.get("to")?.trim().toLowerCase();
    const selected = to
      ? messages.filter((item) => {
          const record = item.message as Record<string, unknown>;
          return String(record.to).toLowerCase() === to;
        })
      : messages;
    return json(response, 200, {
      mode: "development-memory",
      messages: selected,
    });
  }
  if (request.method === "DELETE" && url.pathname === "/messages") {
    messages.length = 0;
    return json(response, 200, { cleared: true });
  }
  return json(response, 404, { error: "NOT_FOUND" });
}

const server = createServer((request, response) => {
  void handle(request, response);
});

server.listen(port, host, () => {
  process.stdout.write(
    `Obliq development mail sink listening on http://${host}:${port}; messages are memory-only and content is not logged.\n`,
  );
});
