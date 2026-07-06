import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { ApiKeyStore } from "../auth/store.js";
import type { UsageStore } from "../usage/store.js";

interface UsageRouteDeps {
  store: UsageStore;
  apiKeyStore: ApiKeyStore;
  authenticate: preHandlerHookHandler;
}

function parseDays(value: unknown): number {
  const parsed = Number(value ?? 7);
  if (!Number.isFinite(parsed) || parsed < 1) return 7;
  return Math.min(Math.floor(parsed), 90);
}

function parseLimit(value: unknown): number {
  const parsed = Number(value ?? 50);
  if (!Number.isFinite(parsed) || parsed < 1) return 50;
  return Math.min(Math.floor(parsed), 100);
}

export async function registerUsageRoutes(
  app: FastifyInstance,
  deps: UsageRouteDeps,
): Promise<void> {
  app.get(
    "/v1/usage",
    { preHandler: deps.authenticate },
    async (request) => {
      const apiKeyId = request.apiKey!.id;
      const stats = await deps.store.getUsage(apiKeyId);

      return {
        object: "usage",
        api_key_id: apiKeyId,
        requests: stats?.requestCount ?? 0,
        prompt_tokens: stats?.promptTokens ?? 0,
        completion_tokens: stats?.completionTokens ?? 0,
        total_tokens: stats?.totalTokens ?? 0,
        last_request_at: stats?.lastRequestAt ?? null,
      };
    },
  );

  app.get<{ Querystring: { days?: string } }>(
    "/v1/usage/history",
    { preHandler: deps.authenticate },
    async (request) => {
      const days = parseDays(request.query.days);
      const keys = await deps.apiKeyStore.listForRecord(request.apiKey!);
      const keyIds = keys.map((key) => key.id);
      const data = await deps.store.getUsageHistory(keyIds, days);

      return {
        object: "usage.history",
        days,
        data: data.map((bucket) => ({
          date: bucket.date,
          requests: bucket.requests,
          prompt_tokens: bucket.promptTokens,
          completion_tokens: bucket.completionTokens,
          total_tokens: bucket.totalTokens,
          cost: bucket.cost,
        })),
      };
    },
  );

  app.get<{ Querystring: { limit?: string; cursor?: string; days?: string } }>(
    "/v1/usage/logs",
    { preHandler: deps.authenticate },
    async (request) => {
      const limit = parseLimit(request.query.limit);
      const cursor = request.query.cursor?.trim() || undefined;
      const daysRaw = request.query.days;
      const days =
        daysRaw !== undefined && daysRaw !== ""
          ? parseDays(daysRaw)
          : undefined;

      const keys = await deps.apiKeyStore.listForRecord(request.apiKey!);
      const keyIds = keys.map((key) => key.id);
      const result = await deps.store.getUsageLogs(keyIds, { limit, cursor, days });

      return {
        object: "usage.logs",
        days: days ?? null,
        data: result.data.map((entry) => ({
          id: entry.id,
          created_at: entry.createdAt,
          api_key_id: entry.apiKeyId,
          route: entry.route,
          provider: entry.provider,
          model: entry.model,
          prompt_tokens: entry.promptTokens,
          completion_tokens: entry.completionTokens,
          total_tokens: entry.totalTokens,
          cost: entry.cost,
          latency_ms: entry.latencyMs,
          fallback_used: entry.fallbackUsed,
          status: entry.status,
        })),
        has_more: result.hasMore,
        next_cursor: result.nextCursor,
      };
    },
  );
}
