import { getAddress } from "viem";
import { SiweMessage } from "siwe";
import { normalizeWalletAddress } from "./wallet.js";

export interface SiweConfig {
  domain: string;
  uri: string;
  chainId: number;
}

export function buildSiweMessage(
  address: string,
  nonce: string,
  config: SiweConfig,
): string {
  const message = new SiweMessage({
    domain: config.domain,
    address: getAddress(address),
    statement: "Sign in to LMX Cloud",
    uri: config.uri,
    version: "1",
    chainId: config.chainId,
    nonce,
  });
  return message.prepareMessage();
}

export async function verifySiweMessage(
  message: string,
  signature: string,
  config: SiweConfig,
): Promise<{ address: string; nonce: string }> {
  const siweMessage = new SiweMessage(message);
  const fields = await siweMessage.verify({
    signature,
    domain: config.domain,
  });

  if (fields.data.chainId !== config.chainId) {
    throw new Error("SIWE chain ID mismatch");
  }

  return {
    address: normalizeWalletAddress(fields.data.address),
    nonce: fields.data.nonce,
  };
}
