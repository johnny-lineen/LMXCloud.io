/** Cost in USD from token count and provider rate ($ per 1k tokens). */
export function calculateRequestCost(
  totalTokens: number,
  costPer1kTokens: number,
): number {
  if (totalTokens <= 0 || costPer1kTokens <= 0) {
    return 0;
  }
  return (totalTokens / 1000) * costPer1kTokens;
}

/** Round to 8 decimal places for stable currency math. */
export function roundCredits(amount: number): number {
  return Math.round(amount * 1e8) / 1e8;
}
