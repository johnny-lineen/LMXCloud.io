import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { ClerkBridge } from "./context/ClerkBridge";
import { CLERK_PUBLISHABLE_KEY } from "./lib/clerk";
import { queryClient, wagmiConfig } from "./lib/wagmi";

function AppShell() {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <AuthProvider clerkEnabled={Boolean(CLERK_PUBLISHABLE_KEY)}>
          <App />
        </AuthProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {CLERK_PUBLISHABLE_KEY ? (
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        signInUrl="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/auth/callback"
        afterSignUpUrl="/auth/callback"
      >
        <ClerkBridge>
          <AppShell />
        </ClerkBridge>
      </ClerkProvider>
    ) : (
      <AppShell />
    )}
  </StrictMode>,
);
