import { timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";

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

function extractBearer(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
}

/** Protects /v1/ops/* with LMX_OPS_API_KEY (Bearer or X-LMX-Ops-Key). */
export function getOpsApiKey(): string | null {
  const key = process.env.LMX_OPS_API_KEY?.trim();
  return key || null;
}

export async function requireOpsAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const expected = getOpsApiKey();
  if (!expected) {
    return reply.status(503).send({
      error: {
        message: "Ops API is not configured (LMX_OPS_API_KEY)",
        type: "ops_disabled",
      },
    });
  }

  const provided =
    extractBearer(headerValue(request.headers.authorization)) ??
    headerValue(request.headers["x-lmx-ops-key"])?.trim() ??
    null;

  if (!provided || !secretsEqual(provided, expected)) {
    return reply.status(401).send({
      error: {
        message: "Invalid or missing ops API key",
        type: "unauthorized",
      },
    });
  }
}
