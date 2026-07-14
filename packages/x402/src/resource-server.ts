import { createFacilitatorConfig } from "@coinbase/x402";
import {
  HTTPFacilitatorClient,
  x402ResourceServer,
} from "@x402/core/server";
import type { Network } from "@x402/core/types";
import { bazaarResourceServerExtension } from "@x402/extensions/bazaar";
import { UptoEvmScheme } from "@x402/evm/upto/server";

export interface CreateLmxX402ResourceServerOptions {
  /** CAIP-2 network id, e.g. `eip155:8453` (Base) or `eip155:84532` (Base Sepolia). */
  networkId: Network;
  cdpApiKeyId?: string;
  cdpApiKeySecret?: string;
  /** Register Bazaar discovery extension (default: true). */
  registerBazaar?: boolean;
}

/**
 * Builds a CDP-backed x402 resource server with the `upto` EVM scheme,
 * matching the HTTP seller setup used by `apps/api`.
 *
 * Callers that need facilitator supported-kinds (e.g. MCP `createPaymentWrapper`)
 * should `await resourceServer.initialize()` after construction. The Fastify HTTP
 * middleware path initializes lazily and can omit that step.
 */
export function createLmxX402ResourceServer(
  options: CreateLmxX402ResourceServerOptions,
): x402ResourceServer {
  const facilitatorClient = new HTTPFacilitatorClient(
    createFacilitatorConfig(options.cdpApiKeyId, options.cdpApiKeySecret),
  );

  const resourceServer = new x402ResourceServer(facilitatorClient);
  resourceServer.register(options.networkId, new UptoEvmScheme());

  if (options.registerBazaar !== false) {
    resourceServer.registerExtension(bazaarResourceServerExtension);
  }

  return resourceServer;
}

/** Format a USDC amount as an x402 price string (e.g. `$0.001250`). */
export function formatUsdPrice(amount: number): string {
  return `$${amount.toFixed(6)}`;
}

/** Map an EVM chain id to a CAIP-2 network string. */
export function toCaip2ChainId(chainId: number): Network {
  return `eip155:${chainId}` as Network;
}
