/**
 * Maps raw wallet / RPC errors to user-safe messages for the billing UI.
 */
export function formatWalletError(err: unknown): string {
  const message =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";

  const lower = message.toLowerCase();

  if (
    lower.includes("user rejected") ||
    lower.includes("user denied") ||
    lower.includes("rejected the request")
  ) {
    return "Transaction cancelled in wallet";
  }

  if (lower.includes("insufficient funds")) {
    return "Insufficient ETH on this network to pay for gas";
  }

  if (
    lower.includes("chain mismatch") ||
    lower.includes("wrong network") ||
    lower.includes("unsupported chain")
  ) {
    return "Your wallet is on the wrong network. Switch networks and try again.";
  }

  if (lower.includes("connector not found") || lower.includes("no wallet")) {
    return "No wallet connector available. Install a browser wallet extension.";
  }

  if (message.trim()) {
    return "Transaction failed. Check your wallet and try again.";
  }

  return "Something went wrong. Please try again.";
}
