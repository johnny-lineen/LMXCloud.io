# @lmxcloud/mcp-server

Lightweight MCP server for LMX Cloud.

## What it exposes

| Tool | API | Auth |
|------|-----|------|
| `get_pricing` | `GET /v1/pricing` | Public |
| `quote_price` | `GET /v1/pricing?model=...` | Public |
| `list_models` | `GET /v1/models` | Public |
| `get_status` | `GET /v1/status` | Public |
| `get_balance` | `GET /v1/balance` | API key required |
| `get_usage` | `GET /v1/usage` | API key required |
| `chat_completion` | `POST /v1/chat/completions` | API key required |

Suggested agent flow: `get_status` → `list_models` → `quote_price` → `get_balance` → `chat_completion` → `get_usage`.

## Per-user API key passthrough

Each caller brings their own `lmx_...` key. Resolution order:

1. `api_key` tool argument (optional override per call)
2. `Authorization: Bearer lmx_...` header (hosted MCP / Cursor)
3. `LMX_API_KEY` in MCP client env (local stdio only)
4. `LMX_ADMIN_API_KEY` on server (optional smoke-test fallback)

`chat_completion` validates the key against `GET /v1/usage` before inference and returns clear errors for missing/invalid keys.

## Environment variables

Server:

- `LMX_API_BASE_URL` (default: `http://127.0.0.1:3000`)
- `LMX_ADMIN_API_KEY` (optional server fallback for smoke tests)
- `LMX_DEFAULT_MODEL` (default: `llama-3-70b`)
- `LMX_MCP_TRANSPORT` (`stdio` or `http`, default: `stdio`)
- `LMX_MCP_HOST` (HTTP mode only, default: `0.0.0.0`)
- `LMX_MCP_PORT` (HTTP mode only, default: `3334`)
- `MCP_RATE_LIMIT_MAX` (default: `60`)
- `MCP_RATE_LIMIT_WINDOW_MS` (default: `60000`)

Client (Cursor `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "lmxcloud": {
      "url": "https://mcp.lmxcloud.io/mcp",
      "headers": {
        "Authorization": "Bearer lmx_YOUR_KEY"
      }
    }
  }
}
```

## Local dev

```bash
pnpm --filter @lmxcloud/mcp-server dev
```

## Hosted HTTP mode

```bash
pnpm --filter @lmxcloud/mcp-server dev:http
```

- MCP: `http://127.0.0.1:3334/mcp`
- Health: `http://127.0.0.1:3334/healthz`

## Deploy (Railway)

1. Service config: `apps/mcp-server/railway.toml`
2. Set `LMX_API_BASE_URL`, `LMX_MCP_TRANSPORT=http`, `LMX_MCP_HOST=0.0.0.0`
3. Optional: `LMX_ADMIN_API_KEY` for internal smoke tests only
4. Users authenticate with their own key via MCP client `Authorization` header
