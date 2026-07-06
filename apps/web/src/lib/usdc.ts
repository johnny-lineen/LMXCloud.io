import { parseEther, parseUnits } from "viem";

export const USDC_DECIMALS = 6;

/** Enough ETH on Base for a typical ERC-20 transfer (well above median gas). */
export const MIN_ETH_FOR_GAS = parseEther("0.00005");

export function parseUsdcAmount(amount: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }
  return parseUnits(amount.toFixed(USDC_DECIMALS), USDC_DECIMALS);
}

export function validateDepositAmount(
  amount: number,
  minUsdc: number,
  maxUsdc: number,
): string | null {
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Enter a valid amount greater than zero";
  }
  if (amount < minUsdc) {
    return `Minimum deposit is $${minUsdc.toFixed(2)} USDC`;
  }
  if (amount > maxUsdc) {
    return `Maximum deposit is $${maxUsdc.toFixed(2)} USDC per transfer`;
  }
  return null;
}
