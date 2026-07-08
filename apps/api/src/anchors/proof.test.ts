import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildReceiptMerkleTree, verifyReceiptMerkleProof } from "./merkle.js";
import { buildUsageLogProof } from "./proof.js";
import { hashReceipt } from "./receipt.js";
import type { AnchorBatchRecord } from "./store.js";

const EVENT = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  provider: "ionet",
  model: "llama-3-70b",
  promptTokens: 12,
  completionTokens: 48,
  totalTokens: 60,
  cost: 0.00001234,
  latencyMs: 842,
  fallbackUsed: false,
  createdAt: "2026-07-07T16:25:11.000Z",
};

describe("buildUsageLogProof", () => {
  it("returns pending when batch is not anchored", () => {
    const receiptHash = hashReceipt(EVENT);
    const proof = buildUsageLogProof(
      { ...EVENT, receiptHash, leafIndex: 0 },
      {
        id: "batch-1",
        merkleRoot: "0x1111111111111111111111111111111111111111111111111111111111111111",
        eventCount: 1,
        status: "submitting",
        txHash: null,
        blockNumber: null,
        chainId: 84532,
        createdAt: EVENT.createdAt,
        anchoredAt: null,
      },
      [receiptHash],
      "0x2222222222222222222222222222222222222222",
    );

    assert.equal(proof.status, "pending");
    assert.equal(proof.receiptHash, receiptHash);
    assert.equal(proof.merkleProof, undefined);
  });

  it("returns anchored proof that verifies", () => {
    const receiptHash = hashReceipt(EVENT);
    const leaves = [
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      receiptHash,
    ] as `0x${string}`[];

    const tree = buildReceiptMerkleTree(leaves);
    const batch: AnchorBatchRecord = {
      id: "batch-2",
      merkleRoot: tree.root,
      eventCount: 2,
      status: "anchored",
      txHash: "0xabc",
      blockNumber: 123n,
      chainId: 84532,
      createdAt: EVENT.createdAt,
      anchoredAt: EVENT.createdAt,
    };

    const proof = buildUsageLogProof(
      { ...EVENT, receiptHash, leafIndex: 1 },
      batch,
      leaves,
      "0x2222222222222222222222222222222222222222",
    );

    assert.equal(proof.status, "anchored");
    assert.ok(proof.merkleProof);
    assert.equal(
      verifyReceiptMerkleProof(proof.merkleRoot!, proof.receiptHash!, proof.merkleProof!),
      true,
    );
  });
});
