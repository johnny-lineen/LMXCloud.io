const STORAGE_KEY = "lmxcloud_dashboard_api_key";
const EMAIL_KEY = "lmxcloud_dashboard_email";
const WALLET_KEY = "lmxcloud_dashboard_wallet";
const AUTH_MODE_KEY = "lmxcloud_dashboard_auth_mode";

export type StoredAuthMode = "clerk" | "wallet";

export function readApiKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function writeApiKey(value: string | null): void {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* optional */
  }
}

export function readEmail(): string {
  try {
    return localStorage.getItem(EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function writeEmail(value: string): void {
  try {
    if (value.trim()) localStorage.setItem(EMAIL_KEY, value.trim());
    else localStorage.removeItem(EMAIL_KEY);
  } catch {
    /* optional */
  }
}

export function readWallet(): string | null {
  try {
    return localStorage.getItem(WALLET_KEY);
  } catch {
    return null;
  }
}

export function writeWallet(value: string | null): void {
  try {
    if (value) localStorage.setItem(WALLET_KEY, value);
    else localStorage.removeItem(WALLET_KEY);
  } catch {
    /* optional */
  }
}

export function readAuthMode(): StoredAuthMode | null {
  try {
    const value = localStorage.getItem(AUTH_MODE_KEY);
    return value === "clerk" || value === "wallet" ? value : null;
  } catch {
    return null;
  }
}

export function writeAuthMode(value: StoredAuthMode | null): void {
  try {
    if (value) localStorage.setItem(AUTH_MODE_KEY, value);
    else localStorage.removeItem(AUTH_MODE_KEY);
  } catch {
    /* optional */
  }
}

export function clearAuthStorage(): void {
  writeApiKey(null);
  writeEmail("");
  writeWallet(null);
  writeAuthMode(null);
}
