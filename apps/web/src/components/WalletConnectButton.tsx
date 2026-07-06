import { useCallback } from "react";
import { getAddress } from "viem";
import { useDisconnect } from "wagmi";
import {
  useWalletSignIn,
  walletSignInButtonLabel,
} from "../hooks/useWalletSignIn";
import { Button } from "./ui/Button";

interface WalletConnectButtonProps {
  label?: string;
  onSuccess?: () => void;
}

export function WalletConnectButton({
  label = "Connect Wallet",
  onSuccess,
}: WalletConnectButtonProps) {
  const { disconnect } = useDisconnect();
  const {
    address,
    isConnected,
    wrongNetwork,
    targetChain,
    phase,
    error,
    busy,
    signIn,
    switchToTargetChain,
    handleConnectThenSign,
    connector,
    connectors,
  } = useWalletSignIn({ onSuccess });

  const handleClick = useCallback(() => {
    const activeConnector = connector ?? connectors[0];
    if (!activeConnector) return;

    if (wrongNetwork && isConnected) {
      void switchToTargetChain().then(() => {
        if (address) signIn(address);
      });
      return;
    }

    if (isConnected && address) {
      signIn(address);
      return;
    }

    handleConnectThenSign(activeConnector);
  }, [
    connector,
    connectors,
    wrongNetwork,
    isConnected,
    address,
    switchToTargetChain,
    signIn,
    handleConnectThenSign,
  ]);

  const buttonLabel = walletSignInButtonLabel(phase, {
    defaultLabel: label,
    wrongNetwork,
    isConnected,
    targetChainName: targetChain.name,
  });

  return (
    <div className="w-full max-w-[400px]">
      {wrongNetwork && isConnected && phase === "idle" && (
        <p className="mb-2 text-center text-body-sm text-on-surface-muted">
          Your wallet is on the wrong network. Switch to {targetChain.name} to sign in.
        </p>
      )}
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={busy}
        onClick={handleClick}
      >
        {buttonLabel}
      </Button>
      {isConnected && address && phase === "idle" && (
        <p className="mt-2 text-center text-body-sm text-on-surface-muted">
          {getAddress(address).slice(0, 6)}…{getAddress(address).slice(-4)}
          {" · "}
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => disconnect()}
          >
            Disconnect
          </button>
        </p>
      )}
      {error && (
        <p className="mt-2 text-center text-body-sm text-error">{error}</p>
      )}
    </div>
  );
}
