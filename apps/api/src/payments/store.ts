import { getPool } from "../db/pool.js";
import { roundCredits } from "../credits/pricing.js";
import type {
  CreateQuotedPaymentInput,
  PaymentEvent,
  PaymentEventStatus,
} from "./types.js";

export interface PaymentStore {
  createQuoted(input: CreateQuotedPaymentInput): Promise<PaymentEvent>;
  findByPayloadHash(payloadHash: string): Promise<PaymentEvent | null>;
  findById(id: string): Promise<PaymentEvent | null>;
  markVerified(id: string, facilitatorRef?: string): Promise<PaymentEvent | null>;
  markSettled(
    id: string,
    txHash: string,
    settledAmount: number,
  ): Promise<PaymentEvent | null>;
  linkUsageEvent(paymentId: string, usageEventId: string): Promise<void>;
  markCompleted(id: string, usageEventId: string): Promise<PaymentEvent | null>;
  markFailed(id: string, reason: string): Promise<PaymentEvent | null>;
  markRefunded(
    id: string,
    refundedAmount: number,
    txHash?: string,
  ): Promise<PaymentEvent | null>;
}

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

function mapRow(row: PaymentEventRow): PaymentEvent {
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
  };
}

export class PostgresPaymentStore implements PaymentStore {
  async createQuoted(input: CreateQuotedPaymentInput): Promise<PaymentEvent> {
    const existing = await this.findByPayloadHash(input.paymentPayloadHash);
    if (existing) {
      return existing;
    }

    const result = await getPool().query<PaymentEventRow>(
      `INSERT INTO payment_events (
         payer_wallet, quoted_amount, chain_id, payment_payload_hash,
         model, route, estimated_tokens, api_key_id, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'quoted')
       ON CONFLICT (payment_payload_hash) DO NOTHING
       RETURNING *`,
      [
        input.payerWallet.toLowerCase(),
        roundCredits(input.quotedAmount),
        input.chainId,
        input.paymentPayloadHash,
        input.model,
        input.route ?? "chat/completions",
        input.estimatedTokens ?? null,
        input.apiKeyId ?? null,
      ],
    );

    if (result.rows[0]) {
      return mapRow(result.rows[0]);
    }

    const replay = await this.findByPayloadHash(input.paymentPayloadHash);
    if (!replay) {
      throw new Error("Failed to create or load payment event");
    }
    return replay;
  }

  async findByPayloadHash(payloadHash: string): Promise<PaymentEvent | null> {
    const result = await getPool().query<PaymentEventRow>(
      `SELECT * FROM payment_events WHERE payment_payload_hash = $1`,
      [payloadHash],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async findById(id: string): Promise<PaymentEvent | null> {
    const result = await getPool().query<PaymentEventRow>(
      `SELECT * FROM payment_events WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async markVerified(
    id: string,
    facilitatorRef?: string,
  ): Promise<PaymentEvent | null> {
    const result = await getPool().query<PaymentEventRow>(
      `UPDATE payment_events
       SET status = 'verified',
           facilitator_ref = COALESCE($2, facilitator_ref),
           verified_at = NOW()
       WHERE id = $1 AND status = 'quoted'
       RETURNING *`,
      [id, facilitatorRef ?? null],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async markSettled(
    id: string,
    txHash: string,
    settledAmount: number,
  ): Promise<PaymentEvent | null> {
    const result = await getPool().query<PaymentEventRow>(
      `UPDATE payment_events
       SET status = 'settled',
           tx_hash = $2,
           settled_amount = $3,
           settled_at = NOW()
       WHERE id = $1 AND status IN ('quoted', 'verified')
       RETURNING *`,
      [id, txHash, roundCredits(settledAmount)],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async linkUsageEvent(paymentId: string, usageEventId: string): Promise<void> {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE payment_events SET usage_event_id = $2 WHERE id = $1`,
        [paymentId, usageEventId],
      );
      await client.query(
        `UPDATE usage_events SET payment_event_id = $1 WHERE id = $2`,
        [paymentId, usageEventId],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async markCompleted(
    id: string,
    usageEventId: string,
  ): Promise<PaymentEvent | null> {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");

      const updated = await client.query<PaymentEventRow>(
        `UPDATE payment_events
         SET status = 'completed',
             usage_event_id = $2,
             completed_at = NOW()
         WHERE id = $1 AND status IN ('settled', 'verified')
         RETURNING *`,
        [id, usageEventId],
      );

      if ((updated.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query(
        `UPDATE usage_events
         SET payment_event_id = $2
         WHERE id = $1`,
        [usageEventId, id],
      );

      await client.query("COMMIT");
      return mapRow(updated.rows[0]!);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async markFailed(id: string, reason: string): Promise<PaymentEvent | null> {
    const result = await getPool().query<PaymentEventRow>(
      `UPDATE payment_events
       SET status = 'failed', failure_reason = $2
       WHERE id = $1 AND status NOT IN ('completed', 'refunded')
       RETURNING *`,
      [id, reason],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async markRefunded(
    id: string,
    refundedAmount: number,
    txHash?: string,
  ): Promise<PaymentEvent | null> {
    const result = await getPool().query<PaymentEventRow>(
      `UPDATE payment_events
       SET status = 'refunded',
           refunded_amount = $2,
           tx_hash = COALESCE($3, tx_hash)
       WHERE id = $1 AND status IN ('settled', 'failed', 'verified')
       RETURNING *`,
      [id, roundCredits(refundedAmount), txHash ?? null],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }
}

export function createPaymentStore(): PaymentStore | null {
  if (!process.env.DATABASE_URL) return null;
  return new PostgresPaymentStore();
}
