import { roundCredits } from "../credits/pricing.js";
import {
  DEFAULT_MAX_COMPLETION_TOKENS,
  MIN_CALL_USDC,
} from "./constants.js";

export interface QuoteInput {
  listPricePer1k: number;
  promptTokens: number;
  maxCompletionTokens?: number;
  minCallUsdc?: number;
}

export interface QuoteResult {
  estimatedTokens: number;
  quotedAmount: number;
  promptTokens: number;
  maxCompletionTokens: number;
}

/** Rough token estimate from message text (~4 characters per token). */
export function estimatePromptTokens(
  messages: Array<{ content: string }>,
): number {
  const chars = messages.reduce((sum, message) => sum + message.content.length, 0);
  return Math.max(1, Math.ceil(chars / 4));
}

export function resolveMaxCompletionTokens(
  maxTokens?: number,
  maxCompletionTokens?: number,
): number {
  if (typeof maxCompletionTokens === "number" && maxCompletionTokens > 0) {
    return maxCompletionTokens;
  }
  if (typeof maxTokens === "number" && maxTokens > 0) {
    return maxTokens;
  }
  return DEFAULT_MAX_COMPLETION_TOKENS;
}

/** Ceiling quote for an x402 call before inference runs. */
export function quoteCallPrice(input: QuoteInput): QuoteResult {
  const maxCompletionTokens =
    input.maxCompletionTokens ?? DEFAULT_MAX_COMPLETION_TOKENS;
  const minCallUsdc = input.minCallUsdc ?? MIN_CALL_USDC;
  const estimatedTokens = input.promptTokens + maxCompletionTokens;
  const raw = (estimatedTokens / 1000) * input.listPricePer1k;
  const quotedAmount = roundCredits(Math.max(minCallUsdc, raw));

  return {
    estimatedTokens,
    quotedAmount,
    promptTokens: input.promptTokens,
    maxCompletionTokens,
  };
}
