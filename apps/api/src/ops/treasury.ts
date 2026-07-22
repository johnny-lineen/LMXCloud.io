import {
  createPublicClient,
  erc20Abi,
  formatEther,
  formatUnits,
  getAddress,
  http,
  type Chain,
} from "viem";
import { base, baseSepolia } from "viem/chains";

export interface TreasuryOpsConfig {
  rpcUrl: string;
  treasuryAddress: string;
  usdcContractAddress: string;
  chainId: number;
  chainLabel: string;
}

export type OpsTreasurySnapshot =
  | {
      status: "ready";
      address: string;
      chainId: number;
      chainLabel: string;
      usdcBalance: number;
      ethBalance: number;
      fetchedAt: string;
      explorerUrl: string;
    }
  | {
      status: "unconfigured";
      reason: string;
    }
  | {
      status: "error";
      address: string;
      chainId: number;
      chainLabel: string;
      reason: string;
    };

function resolveChain(chainId: number): Chain {
  if (chainId === baseSepolia.id) return baseSepolia;
  return base;
}

function explorerAddressUrl(chainId: number, address: string): string {
  const path = `/address/${address}`;
  if (chainId === baseSepolia.id) return `https://sepolia.basescan.org${path}`;
  return `https://basescan.org${path}`;
}

export async function getTreasurySnapshot(
  config: TreasuryOpsConfig | undefined,
): Promise<OpsTreasurySnapshot> {
  if (!config) {
    return {
      status: "unconfigured",
      reason: "Set BASE_RPC_URL and TREASURY_ADDRESS to load treasury balances.",
    };
  }

  const address = getAddress(config.treasuryAddress);
  const usdcContract = getAddress(config.usdcContractAddress) as `0x${string}`;

  try {
    const client = createPublicClient({
      chain: resolveChain(config.chainId),
      transport: http(config.rpcUrl),
    });

    const [ethWei, usdcRaw] = await Promise.all([
      client.getBalance({ address }),
      client.readContract({
        address: usdcContract,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [address],
      }),
    ]);

    return {
      status: "ready",
      address,
      chainId: config.chainId,
      chainLabel: config.chainLabel,
      usdcBalance: Number(formatUnits(usdcRaw, 6)),
      ethBalance: Number(formatEther(ethWei)),
      fetchedAt: new Date().toISOString(),
      explorerUrl: explorerAddressUrl(config.chainId, address),
    };
  } catch (err) {
    return {
      status: "error",
      address,
      chainId: config.chainId,
      chainLabel: config.chainLabel,
      reason: err instanceof Error ? err.message : "Treasury balance lookup failed",
    };
  }
}
