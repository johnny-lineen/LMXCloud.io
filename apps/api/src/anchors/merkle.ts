import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

export interface MerkleTreeResult {
  root: `0x${string}`;
  getProof: (leafIndex: number) => `0x${string}`[];
}

export function buildReceiptMerkleTree(
  receiptHashes: `0x${string}`[],
): MerkleTreeResult {
  if (receiptHashes.length === 0) {
    throw new Error("Cannot build Merkle tree from zero leaves");
  }

  const values = receiptHashes.map((hash) => [hash]);
  const tree = StandardMerkleTree.of(values, ["bytes32"]);

  return {
    root: tree.root as `0x${string}`,
    getProof: (leafIndex: number) => tree.getProof(leafIndex) as `0x${string}`[],
  };
}

export function verifyReceiptMerkleProof(
  root: `0x${string}`,
  receiptHash: `0x${string}`,
  proof: `0x${string}`[],
): boolean {
  return StandardMerkleTree.verify(root, ["bytes32"], [receiptHash], proof);
}
