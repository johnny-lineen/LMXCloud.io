import { useCallback, useEffect, useState } from "react";
import type { Connector } from "wagmi";
import { useChainId, useConnect, useConnection, useSwitchChain } from "wagmi";
import { targetChain } from "../lib/wagmi";
import { formatWalletError } from "../lib/wallet-errors";

export type WalletConnectPhase = "idle" | "connecting" | "switching";

export function useWalletConnect() {
  const { address, status, connector } = useConnection();
  const isConnected = status === "connected";
  const chainId = useChainId();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  const [phase, setPhase] = useState<WalletConnectPhase>("idle");
  const [error, setError] = useState<string | null>(null);

  const wrongNetwork = isConnected && chainId !== targetChain.id;

  const switchToTargetChain = useCallback(async () => {
    setError(null);
    setPhase("switching");
    try {
      await switchChainAsync({ chainId: targetChain.id });
    } catch (err) {
      setError(formatWalletError(err));
      throw err;
    } finally {
      setPhase("idle");
    }
  }, [switchChainAsync]);

  const connectWallet = useCallback(
    (activeConnector?: Connector) => {
      setError(null);
      const chosen = activeConnector ?? connector ?? connectors[0];
      if (!chosen) {
        setError("No wallet connector available");
        return;
      }

      setPhase("connecting");
      connect({ connector: chosen, chainId: targetChain.id });
    },
    [connector, connectors, connect],
  );

  const ensureConnectedOnTargetChain = useCallback(async (): Promise<string> => {
    setError(null);

    if (!isConnected || !address) {
      const chosen = connector ?? connectors[0];
      if (!chosen) {
        throw new Error("No wallet connector available");
      }

      setPhase("connecting");
      const result = await new Promise<string>((resolve, reject) => {
        connect(
          { connector: chosen, chainId: targetChain.id },
          {
            onSuccess: (data) => {
              if (!data.accounts[0]) {
                reject(new Error("Wallet connected without an address"));
                return;
              }
              resolve(data.accounts[0]);
            },
            onError: (err) => reject(err),
          },
        );
      });
      setPhase("idle");
      return result;
    }

    if (chainId !== targetChain.id) {
      await switchToTargetChain();
    }

    return address;
  }, [
    isConnected,
    address,
    connector,
    connectors,
    connect,
    chainId,
    switchToTargetChain,
  ]);

  const busy =
    phase === "switching" ||
    phase === "connecting" ||
    isConnecting ||
    isSwitching;

  const effectivePhase: WalletConnectPhase =
    phase !== "idle"
      ? phase
      : isSwitching
        ? "switching"
        : isConnecting
          ? "connecting"
          : "idle";

  useEffect(() => {
    if (phase === "idle" && !isConnecting && !isSwitching) {
      setError(null);
    }
  }, [address, chainId, phase, isConnecting, isSwitching]);

  return {
    address,
    isConnected,
    chainId,
    wrongNetwork,
    targetChain,
    phase: effectivePhase,
    error,
    busy,
    setError,
    connectWallet,
    switchToTargetChain,
    ensureConnectedOnTargetChain,
    connector,
    connectors,
  };
}

export function walletConnectButtonLabel(
  phase: WalletConnectPhase,
  options: {
    defaultLabel: string;
    wrongNetwork: boolean;
    isConnected: boolean;
    targetChainName: string;
  },
): string {
  if (phase === "connecting") return "Connecting…";
  if (phase === "switching") return "Switching network…";
  if (options.wrongNetwork && options.isConnected) {
    return `Switch to ${options.targetChainName}`;
  }
  return options.defaultLabel;
}
