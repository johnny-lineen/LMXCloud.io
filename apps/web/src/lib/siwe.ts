import { getAddress } from "viem";

export interface SiweMessageParams {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  chainId: number;
  nonce: string;
  issuedAt?: string;
}

/** EIP-4361 message string matching the server-side `siwe` formatter. */
export function buildSiweMessage(params: SiweMessageParams): string {
  const address = getAddress(params.address);
  const issuedAt = params.issuedAt ?? new Date().toISOString();

  const header = `${params.domain} wants you to sign in with your Ethereum account:`;
  let prefix = [header, address].join("\n");
  prefix = [prefix, params.statement].join("\n\n");
  prefix += "\n";

  const suffix = [
    `URI: ${params.uri}`,
    "Version: 1",
    `Chain ID: ${params.chainId}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");

  return [prefix, suffix].join("\n");
}
