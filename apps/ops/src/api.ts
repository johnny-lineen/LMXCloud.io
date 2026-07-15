import type { OpsOverview } from "./types";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") ?? "";

const OPS_KEY_STORAGE = "lmx_ops_api_key";

export function getStoredOpsKey(): string {
  try {
    return localStorage.getItem(OPS_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setStoredOpsKey(key: string): void {
  try {
    if (key) localStorage.setItem(OPS_KEY_STORAGE, key);
    else localStorage.removeItem(OPS_KEY_STORAGE);
  } catch {
    /* ignore */
  }
}

export function getApiBase(): string {
  return API_BASE;
}

export async function fetchOpsOverview(
  opsKey: string,
  opts: { days?: number; limit?: number } = {},
): Promise<OpsOverview> {
  if (!API_BASE) {
    throw new Error("VITE_API_URL is not set");
  }
  if (!opsKey) {
    throw new Error("Ops API key required");
  }

  const params = new URLSearchParams();
  if (opts.days) params.set("days", String(opts.days));
  if (opts.limit) params.set("limit", String(opts.limit));

  const url = `${API_BASE}/v1/ops/overview${params.size ? `?${params}` : ""}`;
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${opsKey}`,
      accept: "application/json",
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return (await res.json()) as OpsOverview;
}
