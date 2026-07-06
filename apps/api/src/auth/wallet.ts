import { getAddress } from "viem";

export function normalizeWalletAddress(address: string): string {
  return getAddress(address).toLowerCase();
}
