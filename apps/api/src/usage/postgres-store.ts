import { getPool } from "../db/pool.js";
import type { KeyUsageStats, RecordUsageInput, UsageStore } from "./store.js";

export class PostgresUsageStore implements UsageStore {
  async recordUsage(input: RecordUsageInput): Promise<void> {
    await getPool().query(
      `INSERT INTO key_usage (
         api_key_id, request_count, prompt_tokens, completion_tokens, total_tokens, last_request_at
       ) VALUES ($1, 1, $2, $3, $4, NOW())
       ON CONFLICT (api_key_id) DO UPDATE SET
         request_count = key_usage.request_count + 1,
         prompt_tokens = key_usage.prompt_tokens + EXCLUDED.prompt_tokens,
         completion_tokens = key_usage.completion_tokens + EXCLUDED.completion_tokens,
         total_tokens = key_usage.total_tokens + EXCLUDED.total_tokens,
         last_request_at = NOW()`,
      [
        input.apiKeyId,
        input.promptTokens,
        input.completionTokens,
        input.promptTokens + input.completionTokens,
      ],
    );
  }

  async getUsage(apiKeyId: string): Promise<KeyUsageStats | null> {
    const result = await getPool().query<{
      api_key_id: string;
      request_count: number;
      prompt_tokens: string;
      completion_tokens: string;
      total_tokens: string;
      last_request_at: Date | null;
    }>(
      `SELECT api_key_id, request_count, prompt_tokens, completion_tokens, total_tokens, last_request_at
       FROM key_usage
       WHERE api_key_id = $1`,
      [apiKeyId],
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      apiKeyId: row.api_key_id,
      requestCount: row.request_count,
      promptTokens: Number(row.prompt_tokens),
      completionTokens: Number(row.completion_tokens),
      totalTokens: Number(row.total_tokens),
      lastRequestAt: row.last_request_at?.toISOString() ?? null,
    };
  }
}
