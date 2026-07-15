import { getPool } from "../db/pool.js";
import type { PaymentEvent, PaymentEventStatus } from "../payments/types.js";

export type OpsChannel = "x402" | "balance" | "mcp";

export type OpsPaymentRow = PaymentEvent & {
  channel: "x402";
};

export type OpsUsageDayBucket = {
  date: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  fallbackCount: number;
  avgLatencyMs: number | null;
};

export type OpsUsageSummary = {
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  fallbackCount: number;
  avgLatencyMs: number | null;
  uniquePayers: number;
  uniqueApiKeys: number;
};

export type OpsRecentUsage = {
  id: string;
  channel: OpsChannel;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  fallbackUsed: boolean;
  payerWallet: string | null;
  apiKeyId: string | null;
  paymentEventId: string | null;
  createdAt: string;
};

interface PaymentEventRow {
  id: string;
  usage_event_id: string | null;
  api_key_id: string | null;
  payer_wallet: string;
  quoted_amount: string;
  settled_amount: string | null;
  refunded_amount: string;
  chain_id: number;
  tx_hash: string | null;
  payment_payload_hash: string;
  facilitator_ref: string | null;
  model: string;
  route: string;
  estimated_tokens: number | null;
  status: PaymentEventStatus;
  failure_reason: string | null;
  created_at: Date;
  verified_at: Date | null;
  settled_at: Date | null;
  completed_at: Date | null;
}

function mapPayment(row: PaymentEventRow): OpsPaymentRow {
  return {
    id: row.id,
    usageEventId: row.usage_event_id,
    apiKeyId: row.api_key_id,
    payerWallet: row.payer_wallet,
    quotedAmount: Number(row.quoted_amount),
    settledAmount: row.settled_amount === null ? null : Number(row.settled_amount),
    refundedAmount: Number(row.refunded_amount),
    chainId: row.chain_id,
    txHash: row.tx_hash,
    paymentPayloadHash: row.payment_payload_hash,
    facilitatorRef: row.facilitator_ref,
    model: row.model,
    route: row.route,
    estimatedTokens: row.estimated_tokens,
    status: row.status,
    failureReason: row.failure_reason,
    createdAt: row.created_at.toISOString(),
    verifiedAt: row.verified_at?.toISOString() ?? null,
    settledAt: row.settled_at?.toISOString() ?? null,
    completedAt: row.completed_at?.toISOString() ?? null,
    channel: "x402",
  };
}

export function hasPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export async function listRecentPayments(limit = 40): Promise<OpsPaymentRow[]> {
  if (!hasPostgres()) return [];

  const result = await getPool().query<PaymentEventRow>(
    `SELECT *
     FROM payment_events
     ORDER BY created_at DESC, id DESC
     LIMIT $1`,
    [Math.max(1, Math.min(limit, 200))],
  );
  return result.rows.map(mapPayment);
}

export async function listUsageHistory(days = 7): Promise<OpsUsageDayBucket[]> {
  if (!hasPostgres()) return [];

  const result = await getPool().query<{
    date: string;
    requests: string;
    prompt_tokens: string;
    completion_tokens: string;
    total_tokens: string;
    cost: string;
    fallback_count: string;
    avg_latency_ms: string | null;
  }>(
    `SELECT
       TO_CHAR(DATE(created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
       COUNT(*)::text AS requests,
       COALESCE(SUM(prompt_tokens), 0)::text AS prompt_tokens,
       COALESCE(SUM(completion_tokens), 0)::text AS completion_tokens,
       COALESCE(SUM(total_tokens), 0)::text AS total_tokens,
       COALESCE(SUM(cost), 0)::text AS cost,
       COUNT(*) FILTER (WHERE fallback_used)::text AS fallback_count,
       ROUND(AVG(latency_ms))::text AS avg_latency_ms
     FROM usage_events
     WHERE created_at >= NOW() - ($1::int || ' days')::interval
     GROUP BY DATE(created_at AT TIME ZONE 'UTC')
     ORDER BY date`,
    [Math.max(1, Math.min(days, 90))],
  );

  return result.rows.map((row) => ({
    date: row.date,
    requests: Number(row.requests),
    promptTokens: Number(row.prompt_tokens),
    completionTokens: Number(row.completion_tokens),
    totalTokens: Number(row.total_tokens),
    cost: Number(row.cost),
    fallbackCount: Number(row.fallback_count),
    avgLatencyMs: row.avg_latency_ms === null ? null : Number(row.avg_latency_ms),
  }));
}

export async function getUsageSummary(days = 7): Promise<OpsUsageSummary> {
  if (!hasPostgres()) {
    return {
      requests: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cost: 0,
      fallbackCount: 0,
      avgLatencyMs: null,
      uniquePayers: 0,
      uniqueApiKeys: 0,
    };
  }

  const result = await getPool().query<{
    requests: string;
    prompt_tokens: string;
    completion_tokens: string;
    total_tokens: string;
    cost: string;
    fallback_count: string;
    avg_latency_ms: string | null;
    unique_payers: string;
    unique_api_keys: string;
  }>(
    `SELECT
       COUNT(*)::text AS requests,
       COALESCE(SUM(prompt_tokens), 0)::text AS prompt_tokens,
       COALESCE(SUM(completion_tokens), 0)::text AS completion_tokens,
       COALESCE(SUM(total_tokens), 0)::text AS total_tokens,
       COALESCE(SUM(cost), 0)::text AS cost,
       COUNT(*) FILTER (WHERE fallback_used)::text AS fallback_count,
       ROUND(AVG(latency_ms))::text AS avg_latency_ms,
       COUNT(DISTINCT payer_wallet)::text AS unique_payers,
       COUNT(DISTINCT api_key_id)::text AS unique_api_keys
     FROM usage_events
     WHERE created_at >= NOW() - ($1::int || ' days')::interval`,
    [Math.max(1, Math.min(days, 90))],
  );

  const row = result.rows[0]!;
  return {
    requests: Number(row.requests),
    promptTokens: Number(row.prompt_tokens),
    completionTokens: Number(row.completion_tokens),
    totalTokens: Number(row.total_tokens),
    cost: Number(row.cost),
    fallbackCount: Number(row.fallback_count),
    avgLatencyMs: row.avg_latency_ms === null ? null : Number(row.avg_latency_ms),
    uniquePayers: Number(row.unique_payers),
    uniqueApiKeys: Number(row.unique_api_keys),
  };
}

export async function listRecentUsage(limit = 40): Promise<OpsRecentUsage[]> {
  if (!hasPostgres()) return [];

  const result = await getPool().query<{
    id: string;
    provider: string;
    model: string;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost: string;
    latency_ms: number | null;
    fallback_used: boolean;
    payer_wallet: string | null;
    api_key_id: string | null;
    payment_event_id: string | null;
    created_at: Date;
  }>(
    `SELECT
       id, provider, model, prompt_tokens, completion_tokens, total_tokens,
       cost, latency_ms, fallback_used, payer_wallet, api_key_id,
       payment_event_id, created_at
     FROM usage_events
     ORDER BY created_at DESC, id DESC
     LIMIT $1`,
    [Math.max(1, Math.min(limit, 200))],
  );

  return result.rows.map((row) => ({
    id: row.id,
    channel: row.payment_event_id ? "x402" : "balance",
    provider: row.provider,
    model: row.model,
    promptTokens: row.prompt_tokens,
    completionTokens: row.completion_tokens,
    totalTokens: row.total_tokens,
    cost: Number(row.cost),
    latencyMs: row.latency_ms ?? 0,
    fallbackUsed: row.fallback_used,
    payerWallet: row.payer_wallet,
    apiKeyId: row.api_key_id,
    paymentEventId: row.payment_event_id,
    createdAt: row.created_at.toISOString(),
  }));
}

export async function paymentStatusCounts(days = 7): Promise<Record<string, number>> {
  if (!hasPostgres()) return {};

  const result = await getPool().query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count
     FROM payment_events
     WHERE created_at >= NOW() - ($1::int || ' days')::interval
     GROUP BY status`,
    [Math.max(1, Math.min(days, 90))],
  );

  return Object.fromEntries(
    result.rows.map((row) => [row.status, Number(row.count)]),
  );
}

export type StuckPaymentSummary = {
  id: string;
  status: string;
  payerWallet: string;
  model: string;
  quotedAmount: number;
  createdAt: string;
  ageMinutes: number;
};

export async function listStuckPayments(
  olderThanMinutes = 15,
  limit = 20,
): Promise<StuckPaymentSummary[]> {
  if (!hasPostgres()) return [];

  const result = await getPool().query<{
    id: string;
    status: string;
    payer_wallet: string;
    model: string;
    quoted_amount: string;
    created_at: Date;
    age_minutes: string;
  }>(
    `SELECT
       id, status, payer_wallet, model, quoted_amount, created_at,
       ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60)::text AS age_minutes
     FROM payment_events
     WHERE status IN ('quoted', 'verified')
       AND created_at < NOW() - ($1::int || ' minutes')::interval
     ORDER BY created_at ASC
     LIMIT $2`,
    [Math.max(1, olderThanMinutes), Math.max(1, Math.min(limit, 100))],
  );

  return result.rows.map((row) => ({
    id: row.id,
    status: row.status,
    payerWallet: row.payer_wallet,
    model: row.model,
    quotedAmount: Number(row.quoted_amount),
    createdAt: row.created_at.toISOString(),
    ageMinutes: Number(row.age_minutes),
  }));
}
