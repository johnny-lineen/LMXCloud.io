import { useCallback, useEffect, useRef, useState } from "react";
import { getAddress } from "viem";
import type { Connector } from "wagmi";
import {
  useChainId,
  useConnect,
  useConnection,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { exchangeWalletSession, fetchWalletNonce } from "../api";
import { useAuth } from "../context/AuthContext";
import { buildSiweMessage } from "../lib/siwe";
import { formatWalletError } from "../lib/wallet-errors";
import { targetChain } from "../lib/wagmi";

export type WalletSignInPhase = "idle" | "connecting" | "switching" | "signing";

interface UseWalletSignInOptions {
  onSuccess?: () => void;
}

export function useWalletSignIn({ onSuccess }: UseWalletSignInOptions = {}) {
  const { completeWalletSession } = useAuth();
  const { address, status, connector } = useConnection();
  const isConnected = status === "connected";
  const chainId = useChainId();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();

  const [phase, setPhase] = useState<WalletSignInPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const pendingSignRef = useRef(false);
  const signingRef = useRef(false);

  const wrongNetwork = isConnected && chainId !== targetChain.id;

  const switchToTargetChain = useCallback(async () => {
    setError(null);
    setPhase("switching");
    try {
      await switchChainAsync({ chainId: targetChain.id });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Switch your wallet to ${targetChain.name} and try again`,
      );
      throw err;
    } finally {
      setPhase("idle");
    }
  }, [switchChainAsync]);

  const runSiwe = useCallback(
    async (activeAddress: string) => {
      if (signingRef.current) return;
      signingRef.current = true;
      setError(null);
      setPhase("signing");

      try {
        const checksummed = getAddress(activeAddress);

        if (chainId !== targetChain.id) {
          await switchToTargetChain();
        }

        const nonceResponse = await fetchWalletNonce(checksummed);
        const message = buildSiweMessage({
          domain: nonceResponse.domain,
          address: checksummed,
          statement: "Sign in to LMX Cloud",
          uri: nonceResponse.uri,
          chainId: nonceResponse.chain_id,
          nonce: nonceResponse.nonce,
        });

        const signature = await signMessageAsync({ message });
        const session = await exchangeWalletSession(message, signature);

        if (!session.wallet) {
          throw new Error("Wallet session did not return a wallet address");
        }

        completeWalletSession(session.session_token, session.wallet);
        onSuccess?.();
      } catch (err) {
        setError(formatWalletError(err));
      } finally {
        setPhase("idle");
        pendingSignRef.current = false;
        signingRef.current = false;
      }
    },
    [
      chainId,
      switchToTargetChain,
      signMessageAsync,
      completeWalletSession,
      onSuccess,
    ],
  );

  const signIn = useCallback(
    (activeAddress?: string) => {
      const addr = activeAddress ?? address;
      if (!addr) {
        setError("No wallet address available");
        return;
      }
      void runSiwe(addr);
    },
    [address, runSiwe],
  );

  const connectWallet = useCallback(() => {
    setError(null);
    const activeConnector = connector ?? connectors[0];
    if (!activeConnector) {
      setError("No wallet connector available");
      return;
    }

    pendingSignRef.current = false;
    setPhase("connecting");
    connect({ connector: activeConnector, chainId: targetChain.id });
  }, [connector, connectors, connect]);

  const handleConnectThenSign = useCallback(
    (activeConnector: Connector) => {
      if (isConnected && address) {
        void runSiwe(address);
        return;
      }

      pendingSignRef.current = true;
      setPhase("connecting");
      connect({ connector: activeConnector, chainId: targetChain.id });
    },
    [isConnected, address, connect, runSiwe],
  );

  const busy =
    phase === "signing" ||
    phase === "switching" ||
    isConnecting ||
    isSwitching;

  useEffect(() => {
    if (!pendingSignRef.current || !address || !connector) return;
    void runSiwe(address);
  }, [address, connector, runSiwe]);

  const effectivePhase: WalletSignInPhase =
    phase !== "idle"
      ? phase
      : isSwitching
        ? "switching"
        : isConnecting
          ? "connecting"
          : "idle";

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
    signIn,
    connectWallet,
    switchToTargetChain,
    handleConnectThenSign,
    connector,
    connectors,
    pendingSignRef,
    runSiwe,
  };
}

export function walletSignInButtonLabel(
  phase: WalletSignInPhase,
  options: {
    defaultLabel: string;
    wrongNetwork: boolean;
    isConnected: boolean;
    targetChainName: string;
  },
): string {
  if (phase === "connecting") return "Connecting…";
  if (phase === "switching") return "Switching network…";
  if (phase === "signing") return "Confirm in wallet…";
  if (options.wrongNetwork && options.isConnected) {
    return `Switch to ${options.targetChainName}`;
  }
  return options.defaultLabel;
}
