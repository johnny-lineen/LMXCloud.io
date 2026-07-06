/** Minimum USDC deposit the UI and poller accept (1 cent). */
export const MIN_DEPOSIT_USDC = 0.01;

/** Default maximum single deposit — override with DEPOSIT_MAX_USDC. */
export const DEFAULT_MAX_DEPOSIT_USDC = 10_000;

export function resolveMaxDepositUsdc(): number {
  const raw = process.env.DEPOSIT_MAX_USDC;
  if (!raw) return DEFAULT_MAX_DEPOSIT_USDC;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= MIN_DEPOSIT_USDC) {
    throw new Error(
      `DEPOSIT_MAX_USDC must be a number greater than ${MIN_DEPOSIT_USDC}`,
    );
  }
  return value;
}

export function isDepositAmountAllowed(
  amountUsdc: number,
  maxDepositUsdc: number,
): boolean {
  return (
    Number.isFinite(amountUsdc) &&
    amountUsdc >= MIN_DEPOSIT_USDC &&
    amountUsdc <= maxDepositUsdc
  );
}
