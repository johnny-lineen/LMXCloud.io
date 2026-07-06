# LMX Cloud — DePIN Inference Router

OpenAI-compatible inference API that routes requests through decentralized compute networks.

## Phase 7 (current)

- Full dashboard at `apps/web` — overview, key management, usage charts, billing
- `GET /v1/usage/history` for daily usage charts
- Enriched `GET /v1/auth/keys` with balance and usage per key

## Phase 6

- Internal credit balance per API key (USD)
- Cost deducted per inference from provider token rates
- `GET /v1/balance`, optional `POST /v1/credits/topup` (dev)
- Demo UI shows balance, cost, and low-balance warnings

## Phase 5

- Neon Postgres storage for API keys + usage (`DATABASE_URL`)
- Key management — `GET /v1/auth/keys`, `DELETE /v1/auth/key`
- Chat rate limiting per API key
- `GET /v1/models` — models from healthy providers

## Phase 4

- Usage tracking per API key — `GET /v1/usage`
- Demo UI shows cumulative key usage after inference

## Phase 3

- Multi-provider routing: io.net, AkashML (optional), Together.ai (optional)
- Health monitor — polls providers every 30s
- Routing strategies via `x-lmx-prefer`: `cheapest`, `fastest`, `depin-only`, `provider:ionet`
- Automatic fallback chain on provider failure
- `GET /v1/status` — live provider health and fallback chain

## Phase 2

- API key auth (`lmx_[32-char-hex]`) on inference endpoints
- `POST /v1/auth/key` — generate a new API key

## Phase 1

- Fastify API server with `POST /v1/chat/completions`
- io.net Intelligence provider adapter
- OpenAI-compatible request/response format

## Prerequisites

- Node.js 20+
- pnpm
- io.net API key from [ai.io.net](https://ai.io.net/ai/api-keys)
- Optional: [AkashML](https://akashml.com) and [Together.ai](https://api.together.xyz) keys for fallback tiers

## Setup

```bash
pnpm install
cp .env.example .env
# Edit .env — IONET_API_KEY required; DATABASE_URL recommended for Postgres storage
pnpm dev
```

## Demo UI

Single-page "try it now" experience at `apps/demo` — generate a key, send inference, see which DePIN provider served the request.

```bash
# Terminal 1 — API (port 3000)
pnpm dev

# Terminal 2 — Demo UI (port 5174)
pnpm dev:demo
```

Open [http://localhost:5174](http://localhost:5174). Set `VITE_API_URL` in `apps/demo/.env` for production (e.g. `https://api.lmxcloud.io`).

## Dashboard (`apps/web`)

Account dashboard for managing multiple API keys, viewing usage charts, and topping up credits.

```bash
# Terminal 1 — API (port 3000)
pnpm dev

# Terminal 2 — Dashboard (port 5173)
pnpm dev:web
```

Open [http://localhost:5173](http://localhost:5173) — redirects to sign in or sign up if you are not logged in.

**Deploy to production:** see [DEPLOY.md](./DEPLOY.md) for Railway + Vercel step-by-step.

## Test

**API docs:** [http://localhost:5173/docs](http://localhost:5173/docs) — quickstart (curl, Python, JavaScript), model list, routing headers, and streaming.

**Provider status:** [http://localhost:5173/status](http://localhost:5173/status) — live health from `GET /v1/status` (no auth).

Quick smoke test:

```bash
curl http://localhost:3000/v1/status
curl http://localhost:3000/v1/models
```

Generate an API key and send a chat completion:

```bash
KEY=$(curl -s -X POST http://localhost:3000/v1/auth/key \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}' | jq -r .api_key)

curl http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer $KEY" \
  -H "x-lmx-prefer: cheapest" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3-70b","messages":[{"role":"user","content":"Hello from LMX Cloud"}]}'
```

Response headers: `x-lmx-provider`, `x-lmx-fallback`, `x-lmx-latency`, `x-lmx-cost`, `x-lmx-balance`.

Authenticated endpoints (usage, balance, keys) use the same `Authorization: Bearer lmx_...` header — see the docs page for full reference.

## Fallback chain

| Tier | Provider   | Type        | Required key     |
|------|------------|-------------|------------------|
| 1    | io.net     | DePIN       | `IONET_API_KEY`  |
| 2    | AkashML    | DePIN       | `AKASHML_API_KEY`|
| 4    | Together   | Centralized | `TOGETHER_API_KEY`|

Providers without API keys are skipped. When Tier 4 serves a request, `x-lmx-fallback` and `x-lmx-provider` reflect it — no silent centralization.

## Project structure

```
apps/api/src/     API server
apps/demo/        Demo UI (Vite + React)
apps/web/         Dashboard (Vite + React)
packages/shared/  OpenAI-compatible TypeScript types
data/             Local API key store (gitignored)
```

## Supported models (aliases)

| LMX alias     | io.net model                          |
|---------------|---------------------------------------|
| `llama-3-70b` | `meta-llama/Llama-3.3-70B-Instruct`   |

Each provider maps aliases to its own upstream model ID.
