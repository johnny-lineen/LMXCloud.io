import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { ChatCompletionRequest } from "@lmxcloud/shared";
import * as Sentry from "@sentry/node";
import { AllProvidersDownError, ModelNotSupportedError, ProviderError } from "../providers/types.js";
import { calculateRequestCost, roundCredits } from "../credits/pricing.js";
import type { CreditStore } from "../credits/store.js";
import { parseRoutingPreference } from "../routing/strategies.js";
import type { InferenceRouter } from "../routing/router.js";
import type { RateLimitResult } from "../rate-limit.js";
import type { UsageStore } from "../usage/store.js";

interface ChatRouteDeps {
  router: InferenceRouter;
  authenticate: preHandlerHookHandler;
  usageStore: UsageStore;
  creditStore: CreditStore;
  chatRateLimit: (key: string) => RateLimitResult;
  minChatCost: number;
}

function isValidMessage(
  msg: unknown,
): msg is ChatCompletionRequest["messages"][number] {
  if (typeof msg !== "object" || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return (
    typeof m.role === "string" &&
    ["system", "user", "assistant", "tool"].includes(m.role) &&
    typeof m.content === "string"
  );
}

function validateRequest(body: unknown): ChatCompletionRequest | string {
  if (typeof body !== "object" || body === null) {
    return "Request body must be a JSON object";
  }

  const b = body as Record<string, unknown>;

  if (typeof b.model !== "string" || b.model.trim() === "") {
    return "Field 'model' is required and must be a non-empty string";
  }

  if (!Array.isArray(b.messages) || b.messages.length === 0) {
    return "Field 'messages' is required and must be a non-empty array";
  }

  for (const msg of b.messages) {
    if (!isValidMessage(msg)) {
      return "Each message must have a valid 'role' and string 'content'";
    }
  }

  return {
    model: b.model,
    messages: b.messages,
    temperature: typeof b.temperature === "number" ? b.temperature : undefined,
    max_tokens: typeof b.max_tokens === "number" ? b.max_tokens : undefined,
    max_completion_tokens:
      typeof b.max_completion_tokens === "number"
        ? b.max_completion_tokens
        : undefined,
    stream: b.stream === true,
  };
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function extractUsageFromSseChunk(chunk: string): {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
} | null {
  const frames = chunk.split("\n\n");
  for (const frame of frames) {
    const lines = frame
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("data:"));

    for (const line of lines) {
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const data = JSON.parse(raw) as {
          usage?: {
            prompt_tokens: number;
            completion_tokens: number;
            total_tokens: number;
          };
        };
        if (data.usage) return data.usage;
      } catch {
        // Ignore malformed vendor chunks; upstream stream continues.
      }
    }
  }
  return null;
}

export async function registerChatRoutes(
  app: FastifyInstance,
  deps: ChatRouteDeps,
): Promise<void> {
  app.post<{ Body: unknown }>(
    "/v1/chat/completions",
    { preHandler: deps.authenticate },
    async (request, reply) => {
      const apiKeyId = request.apiKey!.id;
      const limit = deps.chatRateLimit(apiKeyId);

      if (!limit.allowed) {
        return reply
          .status(429)
          .header("Retry-After", String(limit.retryAfterSec ?? 60))
          .send({
            error: {
              message: `Chat rate limit exceeded. Try again in ${limit.retryAfterSec}s.`,
              type: "rate_limit_error",
            },
          });
      }

      const validated = validateRequest(request.body);

      if (typeof validated === "string") {
        return reply.status(400).send({
          error: { message: validated, type: "invalid_request_error" },
        });
      }

      const hasCredits = await deps.creditStore.hasMinimumBalance(
        apiKeyId,
        deps.minChatCost,
      );

      if (!hasCredits) {
        const balance = await deps.creditStore.getBalance(apiKeyId);
        return reply.status(402).send({
          error: {
            message: `Insufficient credits. Balance: $${roundCredits(balance).toFixed(8)}. Top up to continue.`,
            type: "insufficient_credits",
            code: "insufficient_credits",
          },
        });
      }

      const preference = parseRoutingPreference(headerValue(request.headers["x-lmx-prefer"]));

      try {
        const result = await deps.router.route(validated, preference);

        if (validated.stream) {
          if (!result.stream) {
            throw new ProviderError(
              `Provider ${result.provider} did not return a stream`,
              result.provider,
            );
          }

          reply.hijack();
          reply.raw.statusCode = 200;
          reply.raw.setHeader("Content-Type", "text/event-stream; charset=utf-8");
          reply.raw.setHeader("Cache-Control", "no-cache, no-transform");
          reply.raw.setHeader("Connection", "keep-alive");
          reply.raw.setHeader("x-lmx-provider", result.provider);
          reply.raw.setHeader("x-lmx-fallback", result.fallbackUsed ? "true" : "false");
          reply.raw.setHeader("x-lmx-latency", String(result.latencyMs));

          let usage = result.usage ?? result.response.usage ?? null;
          try {
            for await (const chunk of result.stream) {
              const parsedUsage = extractUsageFromSseChunk(chunk);
              if (parsedUsage) usage = parsedUsage;
              reply.raw.write(chunk);
            }

            const promptTokens = usage?.prompt_tokens ?? 0;
            const completionTokens = usage?.completion_tokens ?? 0;
            const totalTokens = usage?.total_tokens ?? 0;
            const requestCost = roundCredits(
              calculateRequestCost(totalTokens, result.costPer1kTokens),
            );

            const deducted = await deps.creditStore.deduct(apiKeyId, requestCost);
            if (!deducted && requestCost > 0) {
              reply.raw.write(
                `event: lmx.error\ndata: ${JSON.stringify({
                  message: "Insufficient credits to cover streamed request cost",
                  type: "insufficient_credits",
                  code: "insufficient_credits",
                })}\n\n`,
              );
            }

            const balance = await deps.creditStore.getBalance(apiKeyId);
            reply.raw.write(
              `event: lmx.meta\ndata: ${JSON.stringify({
                provider: result.provider,
                fallback: result.fallbackUsed,
                latencyMs: result.latencyMs,
                cost: requestCost,
                balance: roundCredits(balance),
                usage: usage ?? {
                  prompt_tokens: 0,
                  completion_tokens: 0,
                  total_tokens: 0,
                },
              })}\n\n`,
            );

            void deps.usageStore.recordUsage({
              apiKeyId,
              provider: result.provider,
              model: validated.model,
              promptTokens,
              completionTokens,
              latencyMs: result.latencyMs,
              fallbackUsed: result.fallbackUsed,
              cost: requestCost,
            });
          } catch (streamErr) {
            request.log.error({ err: streamErr }, "Streaming response failed");
            reply.raw.write(
              `event: lmx.error\ndata: ${JSON.stringify({
                message: "Streaming interrupted",
                type: "stream_error",
              })}\n\n`,
            );
          } finally {
            reply.raw.end();
          }
          return;
        }

        const usage = result.usage ?? result.response.usage ?? null;
        const totalTokens = usage?.total_tokens ?? 0;
        const requestCost = roundCredits(
          calculateRequestCost(totalTokens, result.costPer1kTokens),
        );

        const deducted = await deps.creditStore.deduct(apiKeyId, requestCost);
        if (!deducted && requestCost > 0) {
          return reply.status(402).send({
            error: {
              message: "Insufficient credits to cover request cost",
              type: "insufficient_credits",
              code: "insufficient_credits",
            },
          });
        }

        const balance = await deps.creditStore.getBalance(apiKeyId);

        reply.header("x-lmx-provider", result.provider);
        reply.header("x-lmx-fallback", result.fallbackUsed ? "true" : "false");
        reply.header("x-lmx-latency", String(result.latencyMs));
        reply.header("x-lmx-cost", String(requestCost));
        reply.header("x-lmx-balance", String(roundCredits(balance)));

        void deps.usageStore.recordUsage({
          apiKeyId,
          provider: result.provider,
          model: validated.model,
          promptTokens: usage?.prompt_tokens ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
          latencyMs: result.latencyMs,
          fallbackUsed: result.fallbackUsed,
          cost: requestCost,
        });

        return reply.send(result.response);
      } catch (err) {
        if (err instanceof ModelNotSupportedError) {
          return reply.status(400).send({
            error: {
              message: err.message,
              type: "invalid_request_error",
              code: "model_not_supported",
              param: "model",
            },
          });
        }

        if (err instanceof AllProvidersDownError) {
          return reply.status(503).send({
            error: {
              message: err.message,
              type: "service_unavailable",
              code: "all_providers_down",
            },
          });
        }

        if (err instanceof ProviderError) {
          request.log.error({ err, provider: err.provider }, "Provider request failed");
          if (process.env.SENTRY_DSN) {
            Sentry.captureException(err);
          }
          const status = err.statusCode === 429 ? 429 : err.statusCode === 401 ? 502 : 504;
          return reply.status(status).send({
            error: {
              message: err.message,
              type: "provider_error",
              code: err.provider,
            },
          });
        }

        request.log.error({ err }, "Unexpected error during chat completion");
        if (process.env.SENTRY_DSN) {
          Sentry.captureException(err);
        }
        return reply.status(500).send({
          error: {
            message: "Internal server error",
            type: "internal_error",
          },
        });
      }
    },
  );
}
