import { timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

/** Header Cloudflare Transform Rules should set on every origin request. */
export const CF_ORIGIN_SECRET_HEADER = "x-origin-secret";

function headerValue(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function secretsEqual(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Rejects HTTP requests that did not arrive via Cloudflare when
 * `LMX_ORIGIN_SECRET` is set. Returns false when the response was already
 * sent (caller should stop). Skips entirely when the env var is unset.
 *
 * `/healthz` is allowed without the header so Railway's origin healthcheck
 * keeps working — `/mcp` still requires the secret.
 */
export function enforceOriginLock(
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  const secret = process.env.LMX_ORIGIN_SECRET?.trim();
  if (!secret) return true;

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  if (url.pathname === "/healthz") return true;

  const provided = headerValue(req.headers[CF_ORIGIN_SECRET_HEADER]);
  if (!provided || !secretsEqual(provided, secret)) {
    res.writeHead(403, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Forbidden" }));
    return false;
  }

  return true;
}
