import type { ChatCompletionRequest } from "@lmxcloud/shared";
import type { HTTPRequestContext } from "@x402/core/server";
import type { ProviderAdapter } from "../providers/types.js";
import type { HealthStore } from "../health/store.js";
import { buildPricingCatalog, getModelPrice } from "../pricing/catalog.js";
import {
  estimatePromptTokens,
  quoteCallPrice,
  resolveMaxCompletionTokens,
} from "../pricing/quote.js";

export interface ChatQuoteContext {
  model: string;
  quote: ReturnType<typeof quoteCallPrice>;
  listPricePer1k: number;
  provider: string;
}

export function parseChatBody(body: unknown): ChatCompletionRequest | string {
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
    if (typeof msg !== "object" || msg === null) {
      return "Each message must be a valid object";
    }
    const m = msg as Record<string, unknown>;
    if (
      typeof m.role !== "string" ||
      !["system", "user", "assistant", "tool"].includes(m.role) ||
      typeof m.content !== "string"
    ) {
      return "Each message must have a valid 'role' and string 'content'";
    }
  }

  return {
    model: b.model,
    messages: b.messages as ChatCompletionRequest["messages"],
    temperature: typeof b.temperature === "number" ? b.temperature : undefined,
    max_tokens: typeof b.max_tokens === "number" ? b.max_tokens : undefined,
    max_completion_tokens:
      typeof b.max_completion_tokens === "number"
        ? b.max_completion_tokens
        : undefined,
    stream: b.stream === true,
  };
}

export function buildChatQuote(
  body: ChatCompletionRequest,
  providers: ProviderAdapter[],
  healthStore: HealthStore,
  options: {
    marginPct: number;
    minCallUsdc: number;
    defaultMaxCompletionTokens: number;
  },
): ChatQuoteContext | string {
  const healthyProviders = providers.filter(
    (provider) => healthStore.getAll()[provider.name]?.healthy,
  );
  const entry = getModelPrice(buildPricingCatalog(healthyProviders, options.marginPct), body.model);
  if (!entry) {
    return `Model "${body.model}" is not available from healthy providers`;
  }

  const promptTokens = estimatePromptTokens(body.messages);
  const maxCompletionTokens = resolveMaxCompletionTokens(
    body.max_tokens,
    body.max_completion_tokens,
  );
  const quote = quoteCallPrice({
    listPricePer1k: entry.listPricePer1kTokens,
    promptTokens,
    maxCompletionTokens,
    minCallUsdc: options.minCallUsdc,
  });

  return {
    model: body.model,
    quote,
    listPricePer1k: entry.listPricePer1kTokens,
    provider: entry.provider,
  };
}

export function buildChatQuoteFromHttpContext(
  context: HTTPRequestContext,
  providers: ProviderAdapter[],
  healthStore: HealthStore,
  options: {
    marginPct: number;
    minCallUsdc: number;
    defaultMaxCompletionTokens: number;
  },
): ChatQuoteContext | string {
  const body = parseChatBody(context.adapter.getBody?.());
  if (typeof body === "string") return body;
  return buildChatQuote(body, providers, healthStore, options);
}

export function formatUsdPrice(amount: number): string {
  return `$${amount.toFixed(6)}`;
}
