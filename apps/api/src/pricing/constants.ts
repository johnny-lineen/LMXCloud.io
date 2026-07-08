/** Margin over cheapest routed provider cost (25%). */
export const PRICING_MARGIN_PCT = 0.25;

/** Minimum USDC charge per x402 call (dust floor). */
export const MIN_CALL_USDC = 0.001;

/** Assumed max completion tokens when the caller omits max_tokens. */
export const DEFAULT_MAX_COMPLETION_TOKENS = 1024;

/** List prices are rounded to 6 decimals for USDC display. */
export function roundListPrice(amount: number): number {
  return Math.round(amount * 1e6) / 1e6;
}

export function toCaip2ChainId(chainId: number): string {
  return `eip155:${chainId}`;
}
