import { getPool } from "./pool.js";

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY,
    key_hash TEXT NOT NULL UNIQUE,
    email TEXT,
    wallet TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_email
    ON api_keys (email) WHERE email IS NOT NULL AND revoked_at IS NULL`,
  `CREATE INDEX IF NOT EXISTS idx_api_keys_wallet
    ON api_keys (wallet) WHERE wallet IS NOT NULL AND revoked_at IS NULL`,
  `CREATE TABLE IF NOT EXISTS key_usage (
    api_key_id UUID PRIMARY KEY REFERENCES api_keys(id) ON DELETE CASCADE,
    request_count INTEGER NOT NULL DEFAULT 0,
    prompt_tokens BIGINT NOT NULL DEFAULT 0,
    completion_tokens BIGINT NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    last_request_at TIMESTAMPTZ
  )`,
  `ALTER TABLE api_keys
    ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(18, 8) NOT NULL DEFAULT 0`,
];

export async function runMigrations(): Promise<void> {
  const client = await getPool().connect();
  try {
    for (const sql of MIGRATIONS) {
      await client.query(sql);
    }
  } finally {
    client.release();
  }
}
