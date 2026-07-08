import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildReceiptMerkleTree, verifyReceiptMerkleProof } from "./merkle.js";

const LEAVES = [
  "0x1111111111111111111111111111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333333333333333333333333333",
  "0x4444444444444444444444444444444444444444444444444444444444444444",
] as `0x${string}`[];

describe("buildReceiptMerkleTree", () => {
  it("builds a root and proofs that verify", () => {
    const tree = buildReceiptMerkleTree(LEAVES);

    assert.match(tree.root, /^0x[0-9a-f]{64}$/);

    for (let index = 0; index < LEAVES.length; index++) {
      const proof = tree.getProof(index);
      assert.equal(
        verifyReceiptMerkleProof(tree.root, LEAVES[index]!, proof),
        true,
      );
    }
  });

  it("rejects proofs for leaves not in the tree", () => {
    const tree = buildReceiptMerkleTree(LEAVES);
    const proof = tree.getProof(0);
    const fakeLeaf =
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as `0x${string}`;

    assert.equal(verifyReceiptMerkleProof(tree.root, fakeLeaf, proof), false);
  });

  it("is deterministic for the same leaf order", () => {
    const a = buildReceiptMerkleTree(LEAVES);
    const b = buildReceiptMerkleTree([...LEAVES]);
    assert.equal(a.root, b.root);
  });
});
