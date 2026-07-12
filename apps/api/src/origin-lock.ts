import { timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

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
 * Rejects requests that did not arrive via Cloudflare when `LMX_ORIGIN_SECRET`
 * is set. Skips entirely when unset (local dev / pre-Cloudflare).
 *
 * `/health` is allowed without the header so Railway's origin healthcheck
 * keeps working — public API routes still require the secret.
 */
export function createOriginLockHook() {
  const secret = process.env.LMX_ORIGIN_SECRET?.trim();
  if (!secret) return null;

  return async function originLock(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const path = request.url.split("?", 1)[0] ?? request.url;
    if (path === "/health") return;

    const provided = headerValue(request.headers[CF_ORIGIN_SECRET_HEADER]);
    if (!provided || !secretsEqual(provided, secret)) {
      return reply.status(403).send({
        error: {
          message: "Forbidden",
          type: "forbidden",
        },
      });
    }
  };
}
