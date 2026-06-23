import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { ApiKeyStore } from "../auth/store.js";
import type { CreditStore } from "../credits/store.js";
import { roundCredits } from "../credits/pricing.js";
import type { RateLimitResult } from "../rate-limit.js";

interface AuthRouteDeps {
  store: ApiKeyStore;
  authenticate: preHandlerHookHandler;
  keyGenRateLimit: (key: string) => RateLimitResult;
  creditStore: CreditStore;
  initialCreditBalance: number;
}

interface CreateKeyBody {
  email?: string;
  wallet?: string;
}

interface RevokeKeyBody {
  id?: string;
}

function validateCreateKeyBody(body: unknown): CreateKeyBody | string {
  if (body === undefined || body === null) {
    return {};
  }

  if (typeof body !== "object") {
    return "Request body must be a JSON object";
  }

  const b = body as Record<string, unknown>;
  const result: CreateKeyBody = {};

  if (b.email !== undefined) {
    if (typeof b.email !== "string" || b.email.trim() === "") {
      return "Field 'email' must be a non-empty string";
    }
    result.email = b.email.trim();
  }

  if (b.wallet !== undefined) {
    if (typeof b.wallet !== "string" || b.wallet.trim() === "") {
      return "Field 'wallet' must be a non-empty string";
    }
    result.wallet = b.wallet.trim();
  }

  return result;
}

function validateRevokeKeyBody(body: unknown): RevokeKeyBody | string {
  if (body === undefined || body === null) {
    return {};
  }

  if (typeof body !== "object") {
    return "Request body must be a JSON object";
  }

  const b = body as Record<string, unknown>;
  if (b.id === undefined) {
    return {};
  }

  if (typeof b.id !== "string" || b.id.trim() === "") {
    return "Field 'id' must be a non-empty string";
  }

  return { id: b.id.trim() };
}

function serializeKey(record: {
  id: string;
  email?: string;
  wallet?: string;
  createdAt: string;
  lastUsedAt?: string;
}) {
  return {
    object: "api_key",
    id: record.id,
    email: record.email ?? null,
    wallet: record.wallet ?? null,
    created_at: record.createdAt,
    last_used_at: record.lastUsedAt ?? null,
  };
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  deps: AuthRouteDeps,
): Promise<void> {
  app.post<{ Body: unknown }>("/v1/auth/key", async (request, reply) => {
    const clientIp = request.ip;
    const limit = deps.keyGenRateLimit(clientIp);

    if (!limit.allowed) {
      return reply
        .status(429)
        .header("Retry-After", String(limit.retryAfterSec ?? 60))
        .send({
          error: {
            message: `Rate limit exceeded. Try again in ${limit.retryAfterSec}s.`,
            type: "rate_limit_error",
          },
        });
    }

    const validated = validateCreateKeyBody(request.body);

    if (typeof validated === "string") {
      return reply.status(400).send({
        error: { message: validated, type: "invalid_request_error" },
      });
    }

    const { record, plainKey } = await deps.store.create(validated);
    await deps.creditStore.credit(record.id, deps.initialCreditBalance);
    const balance = await deps.creditStore.getBalance(record.id);

    return reply.status(201).send({
      object: "api_key",
      api_key: plainKey,
      id: record.id,
      email: record.email ?? null,
      wallet: record.wallet ?? null,
      created_at: record.createdAt,
      balance: roundCredits(balance),
      currency: "USD",
    });
  });

  app.get(
    "/v1/auth/keys",
    { preHandler: deps.authenticate },
    async (request) => {
      const records = await deps.store.listForRecord(request.apiKey!);

      return {
        object: "list",
        data: records.map(serializeKey),
      };
    },
  );

  app.delete<{ Body: unknown }>(
    "/v1/auth/key",
    { preHandler: deps.authenticate },
    async (request, reply) => {
      const validated = validateRevokeKeyBody(request.body);

      if (typeof validated === "string") {
        return reply.status(400).send({
          error: { message: validated, type: "invalid_request_error" },
        });
      }

      const targetId = validated.id ?? request.apiKey!.id;
      const revoked = await deps.store.revoke(targetId, request.apiKey!);

      if (!revoked) {
        return reply.status(404).send({
          error: {
            message: "API key not found or already revoked",
            type: "invalid_request_error",
          },
        });
      }

      return reply.status(200).send({
        object: "api_key.deleted",
        id: targetId,
        deleted: true,
      });
    },
  );
}
