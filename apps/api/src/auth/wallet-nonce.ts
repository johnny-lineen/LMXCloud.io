import crypto from "crypto";
import { getPool } from "../db/pool.js";
import { normalizeWalletAddress } from "./wallet.js";

const NONCE_TTL_MS = 5 * 60 * 1000;

export interface WalletNonceRecord {
  address: string;
  nonce: string;
  expiresAt: Date;
}

export interface WalletNonceStore {
  issue(address: string): Promise<WalletNonceRecord>;
  consume(address: string, nonce: string): Promise<boolean>;
}

function generateNonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

class InMemoryWalletNonceStore implements WalletNonceStore {
  private readonly entries = new Map<string, { nonce: string; expiresAt: number }>();

  async issue(address: string): Promise<WalletNonceRecord> {
    const normalized = normalizeWalletAddress(address);
    const nonce = generateNonce();
    const expiresAt = Date.now() + NONCE_TTL_MS;
    this.entries.set(normalized, { nonce, expiresAt });
    this.prune();
    return { address: normalized, nonce, expiresAt: new Date(expiresAt) };
  }

  async consume(address: string, nonce: string): Promise<boolean> {
    const normalized = normalizeWalletAddress(address);
    const entry = this.entries.get(normalized);
    if (!entry || entry.nonce !== nonce || entry.expiresAt < Date.now()) {
      return false;
    }
    this.entries.delete(normalized);
    return true;
  }

  private prune(): void {
    const now = Date.now();
    for (const [address, entry] of this.entries) {
      if (entry.expiresAt < now) {
        this.entries.delete(address);
      }
    }
  }
}

class PostgresWalletNonceStore implements WalletNonceStore {
  async issue(address: string): Promise<WalletNonceRecord> {
    const normalized = normalizeWalletAddress(address);
    const nonce = generateNonce();
    const expiresAt = new Date(Date.now() + NONCE_TTL_MS);

    await getPool().query(
      `DELETE FROM wallet_auth_nonces WHERE address = $1 OR expires_at < NOW()`,
      [normalized],
    );
    await getPool().query(
      `INSERT INTO wallet_auth_nonces (address, nonce, expires_at)
       VALUES ($1, $2, $3)`,
      [normalized, nonce, expiresAt.toISOString()],
    );

    return { address: normalized, nonce, expiresAt };
  }

  async consume(address: string, nonce: string): Promise<boolean> {
    const normalized = normalizeWalletAddress(address);
    const result = await getPool().query(
      `DELETE FROM wallet_auth_nonces
       WHERE address = $1 AND nonce = $2 AND expires_at > NOW()
       RETURNING address`,
      [normalized, nonce],
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export function createWalletNonceStore(): WalletNonceStore {
  if (process.env.DATABASE_URL) {
    return new PostgresWalletNonceStore();
  }
  return new InMemoryWalletNonceStore();
}
