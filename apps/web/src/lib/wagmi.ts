import { QueryClient } from "@tanstack/react-query";
import type { Chain } from "viem";
import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected } from "wagmi/connectors";

const chainId = Number(import.meta.env.VITE_CHAIN_ID ?? 8453);
const rpcUrl = import.meta.env.VITE_BASE_RPC_URL as string | undefined;

const chainsById: Record<number, Chain> = {
  [base.id]: base,
  [baseSepolia.id]: baseSepolia,
};

export const targetChain = chainsById[chainId] ?? base;

const transport = rpcUrl ? http(rpcUrl) : http();

export const wagmiConfig = createConfig({
  chains: [targetChain],
  connectors: [injected(), coinbaseWallet({ appName: "LMX Cloud" })],
  transports: {
    [targetChain.id]: transport,
  },
});

export const queryClient = new QueryClient();
