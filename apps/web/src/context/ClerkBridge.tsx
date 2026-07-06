import { createContext, useContext, type ReactNode } from "react";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";

type ClerkSignOut = () => Promise<unknown>;

const ClerkSignOutContext = createContext<ClerkSignOut | null>(null);

export function ClerkBridge({ children }: { children: ReactNode }) {
  const { signOut } = useClerkAuth();
  return (
    <ClerkSignOutContext.Provider value={signOut}>
      {children}
    </ClerkSignOutContext.Provider>
  );
}

export function useClerkSignOut(): ClerkSignOut | null {
  return useContext(ClerkSignOutContext);
}
