import { keccak256, toBytes } from "viem";
import { roundCredits } from "../credits/pricing.js";

/** Version string baked into every receipt payload for future schema migrations. */
export const RECEIPT_VERSION = "lmx_receipt_v1";

export interface ReceiptInput {
  id: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  fallbackUsed: boolean;
  createdAt: string;
}

export type ReceiptPayload = {
  version: typeof RECEIPT_VERSION;
  id: string;
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost: string;
  latency_ms: number;
  fallback_used: boolean;
  created_at: string;
};

/** Fixed 8-decimal cost string matching `roundCredits()` storage semantics. */
export function formatCostForReceipt(cost: number): string {
  return roundCredits(cost).toFixed(8);
}

export function buildReceiptPayload(input: ReceiptInput): ReceiptPayload {
  return {
    version: RECEIPT_VERSION,
    id: input.id,
    provider: input.provider,
    model: input.model,
    prompt_tokens: input.promptTokens,
    completion_tokens: input.completionTokens,
    total_tokens: input.totalTokens,
    cost: formatCostForReceipt(input.cost),
    latency_ms: input.latencyMs,
    fallback_used: input.fallbackUsed,
    created_at: input.createdAt,
  };
}

/** Deterministic JSON with alphabetically sorted keys — do not change without bumping version. */
export function canonicalizeReceiptPayload(payload: ReceiptPayload): string {
  const sorted = Object.keys(payload).sort() as (keyof ReceiptPayload)[];
  const ordered: Record<string, unknown> = {};
  for (const key of sorted) {
    ordered[key] = payload[key];
  }
  return JSON.stringify(ordered);
}

export function hashReceipt(input: ReceiptInput): `0x${string}` {
  const payload = buildReceiptPayload(input);
  return keccak256(toBytes(canonicalizeReceiptPayload(payload)));
}
