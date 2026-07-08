# LMX Cloud — OpenAI-Compatible Inference Router

OpenAI-compatible inference API that routes requests through decentralized compute (io.net, Akash) with automatic provider fallback. Evolving into Web3-native infrastructure: wallet-based identity (SIWE), on-chain USDC funding on Base, and verifiable routing logs for developers and autonomous agents.

## Current capabilities

- Multi-provider routing with health-aware fallback and transparent `x-lmx-*` headers
- Streaming chat completions (SSE) with billing metadata
- Email sign-in (Clerk) or wallet sign-in (SIWE) with session tokens and API keys
- USDC deposits on Base credited to inference balance after on-chain confirmations
- Dashboard at `apps/web` — keys, usage, billing, per-request logs, provider status

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
# Edit .env — IONET_API_KEY and SESSION_SECRET required; DATABASE_URL recommended
pnpm dev
```

### Web3 environment variables

Wallet auth and USDC deposits are configured in `apps/api/src/config.ts`. Set these in `.env` when running wallet sign-in or on-chain funding locally:

| Variable | Purpose | Default |
|----------|---------|---------|
| `SIWE_DOMAIN` | EIP-4361 domain in SIWE messages | `localhost` |
| `SIWE_URI` | EIP-4361 URI (dashboard origin) | `http://localhost:5173` |
| `SIWE_CHAIN_ID` | Chain ID for SIWE and deposits | `8453` (Base mainnet); use `84532` for Base Sepolia |
| `BASE_RPC_URL` | JSON-RPC URL for deposit poller | — (required with treasury for deposits) |
| `TREASURY_ADDRESS` | Wallet that receives USDC deposits | — |
| `USDC_CONTRACT_ADDRESS` | ERC-20 USDC contract on the chain | Base mainnet or Sepolia USDC if unset |
| `DEPOSIT_CONFIRMATIONS` | Block confirmations before crediting | `10` |
| `DEPOSIT_POLL_INTERVAL_MS` | How often the poller scans blocks | `15000` |
| `DEPOSIT_LOOKBACK_BLOCKS` | Blocks scanned on first poll | `100` |
| `DEPOSIT_MAX_USDC` | Maximum single deposit amount | `10000` |
| `CREDITS_ALLOW_SELF_TOPUP` | Enable `POST /v1/credits/topup` (dev only) | `true` in `.env.example` |
| `CLERK_SECRET_KEY` | Verify Clerk session tokens from the dashboard | — |
| `SESSION_SECRET` | Sign dashboard/wallet session tokens | required at boot |
| `SESSION_TTL_MS` | Session token lifetime | 30 days |

Deposits activate only when `DATABASE_URL`, `BASE_RPC_URL`, and `TREASURY_ADDRESS` are all set. `CREDITS_ALLOW_SELF_TOPUP` must not be enabled in production.

## Wallet auth and USDC funding (local)

**Wallet sign-in (SIWE)** — alternative to Clerk email sign-in:

1. `POST /v1/auth/wallet/nonce` with `{ "address": "0x..." }` — returns nonce, `domain`, `uri`, and `chain_id`.
2. Sign an EIP-4361 message with statement `Sign in to LMX Cloud`.
3. `POST /v1/auth/wallet/verify` with `{ "message", "signature" }` — returns `session_token` and `api_key_id`.

Headless agent example (no browser):

```bash
WALLET_PRIVATE_KEY=0x... API_URL=http://localhost:3000 node scripts/wallet-auth.mjs
```

**USDC funding** — requires a wallet-linked account (SIWE sign-in) and deposit env vars above:

1. Authenticate with your `session_token` or API key.
2. `GET /v1/billing/deposit-info` — treasury address, USDC contract, limits, and your verified wallet.
3. Send USDC via ERC-20 `transfer` from that wallet to the treasury on Base.
4. `GET /v1/billing/deposits` — track `pending` → `credited` (or `unmatched` if sent from the wrong address).

For quick local testing without on-chain transfers, keep `CREDITS_ALLOW_SELF_TOPUP=true` and use `POST /v1/credits/topup` with `{ "amount": 10 }` — this bypasses the treasury entirely.

See [http://localhost:5173/docs](http://localhost:5173/docs) for full request/response shapes.

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

**API docs:** [http://localhost:5173/docs](http://localhost:5173/docs) — overview, quickstart, wallet auth, USDC funding, routing, streaming, and roadmap.

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

LMX exposes **30 short aliases** mapped to io.net and AkashML upstream IDs. The catalog lives in `packages/shared/src/models.ts` and is verified with live chat completions.

`GET /v1/models` returns aliases from **healthy** providers only. The router skips providers that do not support the requested alias.

| LMX alias | Upstream ID | io.net | AkashML |
|-----------|-------------|:------:|:-------:|
| `llama-3-70b` | `meta-llama/Llama-3.3-70B-Instruct` | ✓ | ✓ |
| `llama-3.3-70b` | same | ✓ | ✓ |
| `qwen-3.6-35b` | `Qwen/Qwen3.6-35B-A3B` | ✓ | ✓ |
| `deepseek-v4-flash` | `deepseek-ai/DeepSeek-V4-Flash` | ✓ | ✓ |
| `glm-5.2` | `zai-org/GLM-5.2` | ✓ | ✓ |
| `qwen-3.5-35b` | `Qwen/Qwen3.5-35B-A3B` | | ✓ |

Plus io.net-only models (`llama-4-maverick`, `deepseek-r1`, `kimi-k2.6`, `gpt-oss-120b`, …). See the [landing page models section](http://localhost:5173/#models) or `packages/shared/src/models.ts` for the full list.
