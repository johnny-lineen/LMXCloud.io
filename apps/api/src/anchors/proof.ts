import {
  RECEIPT_VERSION,
  buildReceiptPayload,
  hashReceipt,
  type ReceiptPayload,
} from "./receipt.js";
import { buildReceiptMerkleTree } from "./merkle.js";
import type { AnchorBatchRecord } from "./store.js";

export type UsageLogProofStatus = "no_receipt" | "pending" | "anchored";

export interface UsageLogProofResult {
  logId: string;
  status: UsageLogProofStatus;
  receiptVersion: typeof RECEIPT_VERSION;
  receipt?: ReceiptPayload;
  receiptHash?: `0x${string}`;
  leafIndex?: number;
  merkleProof?: `0x${string}`[];
  merkleRoot?: `0x${string}`;
  anchor?: {
    chainId: number;
    contractAddress: `0x${string}`;
    txHash: string;
    blockNumber: string | null;
    anchoredAt: string | null;
  };
}

export interface UsageEventForProof {
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
  receiptHash: string | null;
  leafIndex: number | null;
}

export function buildUsageLogProof(
  event: UsageEventForProof,
  batch: AnchorBatchRecord | null,
  batchReceiptHashes: `0x${string}`[],
  contractAddress: `0x${string}`,
): UsageLogProofResult {
  const base: Pick<UsageLogProofResult, "logId" | "receiptVersion"> = {
    logId: event.id,
    receiptVersion: RECEIPT_VERSION,
  };

  if (!event.receiptHash) {
    return { ...base, status: "no_receipt" };
  }

  const receiptInput = {
    id: event.id,
    provider: event.provider,
    model: event.model,
    promptTokens: event.promptTokens,
    completionTokens: event.completionTokens,
    totalTokens: event.totalTokens,
    cost: event.cost,
    latencyMs: event.latencyMs,
    fallbackUsed: event.fallbackUsed,
    createdAt: event.createdAt,
  };

  const receipt = buildReceiptPayload(receiptInput);
  const receiptHash = hashReceipt(receiptInput);

  if (receiptHash !== event.receiptHash) {
    throw new Error(`Stored receipt hash mismatch for log ${event.id}`);
  }

  if (!batch || batch.status !== "anchored" || event.leafIndex === null) {
    return {
      ...base,
      status: "pending",
      receipt,
      receiptHash,
      leafIndex: event.leafIndex ?? undefined,
    };
  }

  const tree = buildReceiptMerkleTree(batchReceiptHashes);
  if (tree.root !== batch.merkleRoot) {
    throw new Error(`Merkle root mismatch for batch ${batch.id}`);
  }

  return {
    ...base,
    status: "anchored",
    receipt,
    receiptHash,
    leafIndex: event.leafIndex,
    merkleProof: tree.getProof(event.leafIndex),
    merkleRoot: batch.merkleRoot,
    anchor: {
      chainId: batch.chainId,
      contractAddress,
      txHash: batch.txHash ?? "0x0",
      blockNumber: batch.blockNumber?.toString() ?? null,
      anchoredAt: batch.anchoredAt,
    },
  };
}
