type LogLevel = "info" | "warn" | "error";

type ToolLogEvent = {
  level?: LogLevel;
  tool: string;
  callerId: string;
  source: string;
  ok: boolean;
  latencyMs?: number;
  detail?: string;
};

function opsIngestUrl(): string | null {
  const base = process.env.LMX_API_BASE_URL?.replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/v1/ops/mcp-events`;
}

function forwardToOpsApi(event: ToolLogEvent): void {
  const url = opsIngestUrl();
  const opsKey = process.env.LMX_OPS_API_KEY?.trim();
  if (!url || !opsKey) return;

  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${opsKey}`,
  };
  const originSecret = process.env.LMX_ORIGIN_SECRET?.trim();
  if (originSecret) {
    headers["x-origin-secret"] = originSecret;
  }

  const body = JSON.stringify({
    tool: event.tool,
    callerId: event.callerId,
    authSource: event.source,
    ok: event.ok,
    level: event.level ?? (event.ok ? "info" : "error"),
    latencyMs: event.latencyMs,
    detail: event.detail,
    ts: new Date().toISOString(),
  });

  void fetch(url, {
    method: "POST",
    headers,
    body,
  }).catch(() => {
    /* fire-and-forget — ops visibility must not break MCP tool calls */
  });
}

export function logToolEvent(event: ToolLogEvent): void {
  const payload = {
    ts: new Date().toISOString(),
    service: "lmxcloud-mcp",
    level: event.level ?? (event.ok ? "info" : "error"),
    tool: event.tool,
    caller_id: event.callerId,
    auth_source: event.source,
    ok: event.ok,
    latency_ms: event.latencyMs,
    detail: event.detail,
  };

  process.stderr.write(`${JSON.stringify(payload)}\n`);
  forwardToOpsApi(event);
}
