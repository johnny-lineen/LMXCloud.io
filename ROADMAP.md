# LMX Cloud — Roadmap

Original goal: go from working proof-of-concept (Phase 1-7) to something you can hand to strangers — developers trying it for free — without it breaking, leaking data, or embarrassing you. That base layer is done. The roadmap has since grown a second, bigger goal on top of it: reposition as Web3-native infrastructure and become "findable and payable" by autonomous agents (Phase 1 distribution, below). Both tracks are tracked in this one file — free-beta hardening didn't stop mattering, it's just no longer the only thing happening.

## CURRENT STATE SNAPSHOT (2026-07-08, late evening) — read this first

Everything below is verified directly against the code and local test runs, not assumed from memory or from what Cursor's own summaries claimed. This section supersedes the blow-by-blow notes further down for a quick read; the detailed sections below stay as the record of *why* each decision was made.

### Built so far

- **Core inference router** — multi-provider routing (io.net + Akash both active on Railway; Together deliberately not configured), health-aware fallback, streaming chat completions (real SSE), 30 model aliases. Credits deduct *after* successful inference, not before.
- **Security/ops baseline** — old account-takeover login route deleted, `SESSION_SECRET` required at boot in production, rate limits (5 keys/hour per IP, 30 chat/min per key), Sentry fully wired (init + global error handler). CORS decision documented: keep `origin: true` for OpenAI-compatible public API; Bearer token is the security boundary.
- **Full dashboard** (`apps/web`) — overview, keys, usage, per-request logs, public status page, billing, docs page.
- **Web3-1: wallet identity + USDC funding on Base — shipped, hardened, verified end-to-end.** SIWE sign-in (browser or raw keypair script), Clerk as alternate auth, USDC deposits auto-crediting via confirmation-gated poller, in-console "Add Credits" flow, adaptive billing refresh, wrong-network detection, unmatched-deposit guidance. Railway confirmed on Base mainnet config (`SIWE_CHAIN_ID`, `BASE_RPC_URL`).
- **Web3-2: verifiable on-chain logs — shipped, verified end-to-end on Base Sepolia (2026-07-07).** Per-request `lmx_receipt_v1` receipts, batched Merkle anchoring via `LmxLogAnchor` + background poller, `GET /v1/usage/logs/:id/proof`, anchoring on `GET /v1/status` and `StatusPage.tsx`, `pnpm verify:receipt` CLI, unit tests for receipt/Merkle/proof. Historical logs before enablement are not retroactively verifiable.
- **x402 Sprint 1 — shipped (2026-07-07).** Per-call pricing catalog (`apps/api/src/pricing/`), `GET /v1/pricing`, `payment_events` migration + Postgres store, ADRs in `docs/x402-pricing.md` and `docs/x402-verification.md` (CDP Facilitator chosen).
- **x402 Sprint 2 — verified end-to-end on Base Sepolia (2026-07-08).** `@x402/fastify` middleware on `POST /v1/chat/completions`, dual path (Bearer → balance; no key → x402), CDP verify/settle hooks, `setSettlementOverrides` for actual cost. Unpaid probe (`pnpm test:x402` → 402 in ~30ms) and paid E2E (`pnpm test:x402 -- --pay`) both green: verify → inference → settle with `payment_events` persistence. Paid soak (`--repeat 10`) also green on dedicated Sepolia RPC.
- **x402 Sprint 3 — partially shipped (2026-07-08, in progress).** Sepolia RPC reliability close-out done (`DEPOSIT_MAX_LOG_BLOCK_RANGE` env + one-time smaller-chunk retry on provider range-limit errors). x402 abuse hardening (partial): replay rejection for consumed payment payloads (`x402_payment_replay`), wallet-aware anonymous rate-limit keys, `X402_ANON_RATE_LIMIT_*` env support. Reliability harness: `test:x402:soak` with `--repeat` / `--delay-ms`. Mainnet profile wired: `.env.mainnet`, `dev:mainnet`, `test:x402:mainnet-canary`, `check:mainnet-balance`; unpaid 402 on `eip155:8453` verified. **Paid mainnet canary not yet green** — see blockers below.
- **Documentation refresh** — `README.md` and `DocsPage.tsx` describe Web3 direction, wallet auth, USDC funding, verifiable logs, x402 pricing endpoint, and public roadmap section.

### Known gaps / needs hardening (verified 2026-07-08)

**Security — fix before more money flows:**
- ~~**Wallet squat on `POST /v1/auth/key` (HIGH).**~~ **Fixed 2026-07-07.** Unauthenticated key mint no longer accepts a `wallet` field; wallet-linked keys require SIWE (`/v1/auth/wallet/verify`) or authenticated `POST /v1/auth/keys`.

**x402 — resolved blockers (Sprint 2 close-out, verified 2026-07-08):**

| Blocker | Status |
|---------|--------|
| Paid E2E hang on Sepolia | **Resolved.** Early body replay hook survives verify gap; `pnpm test:x402 -- --pay` returns 200 and settles. |
| Neon DB unreachable locally | **Resolved in current dev env.** `payment_events` writes succeeding; fire-and-forget + 5s PG connect timeout in place. |
| Flaky public Sepolia RPC | **Resolved.** Dedicated Base Sepolia Alchemy endpoint; paid soak 10/10 green. |
| Deposit poller block-range errors | **Resolved.** `DEPOSIT_MAX_LOG_BLOCK_RANGE` configurable; one-time fallback retry on range-limit responses. |

**x402 Sprint 3 — active blockers:**

| Blocker | Symptom | Likely cause | Fix direction |
|---------|---------|--------------|---------------|
| **Mainnet paid canary — RPC throughput** | `pnpm test:x402:mainnet-canary` fails with Alchemy `429` / "exceeded compute units per second" during Permit2 approval or balance reads | Free/low-tier Alchemy mainnet app rate-limited under burst RPC load | Upgrade Alchemy plan or swap `BASE_RPC_URL` in `.env.mainnet` to higher-throughput provider (paid Alchemy, Coinbase CDP node); rerun canary |
| **Mainnet paid canary — not yet settled** | No `payment_events` row with `chain_id: 8453` yet | Blocked by RPC 429 before verify/settle completes | After RPC fix: `dev:mainnet` + `test:x402:mainnet-canary`; confirm `completed` row with mainnet tx hash |
| **CDP verify latency** | Every paid call waits 1–2+ min at facilitator | External CDP `/verify` + on-chain simulation | Expected for beta; document in ops; consider async UX / status for agents later |
| **Dev env hygiene** | `EADDRINUSE :3000`, tests hit stale servers | Multiple `pnpm dev` instances | One API process on 3000 when testing x402 |

**Hard blockers for Phase 1:**
- **Week 3 legal** — ToS, privacy policy, acceptable use, feedback channel. **Drafts in `legal/` and `/legal/*` (2026-07-08).** Attorney review still required before Bazaar listing.
- ~~**x402 paid path verified on testnet**~~ — **Done 2026-07-08.** Sprint 2 closed on Base Sepolia.
- **Mainnet x402 flip not yet verified** — Sprint 3 in progress: mainnet profile wired, payer wallet funded on Base (`~0.0009 ETH`, `~2.28 USDC` as of 2026-07-08), unpaid 402 on mainnet confirmed; paid canary blocked on RPC 429 only.
- **Payment failure reconciliation** — partial: x402 middleware cancels verified payment on handler 4xx/5xx; no explicit refund tx or user-visible credit-back when provider fails after balance deduct.

**Ops / scale (fine for single-instance beta, harden before scaling):**
- Rate limiter and SIWE nonce store are in-memory — reset on deploy, ineffective across multiple Railway instances. **Partial mitigation available:** Cloudflare edge rate limiting (see new section below) adds a layer that survives redeploys/multi-instance regardless of app-level state; app-level Redis-backed limiter is still the real fix, not replaced.
- Uptime monitor (UptimeRobot/Better Stack) — can't verify from code; confirm externally.
- Streaming edge case: if stream completes but final `deduct` fails, client already received tokens with no recovery.
- x402 streaming not supported yet (`x402_stream_unsupported` on paid path).
- **New (2026-07-11): edge hardening not yet in place.** `api.lmxcloud.io` and `mcp.lmxcloud.io` are about to take traffic from strangers' autonomous agents (Bazaar/Agentic.Market listing, Distribution Sprint 4) with no origin-level DDoS/WAF protection today — see "Cloudflare edge hardening" section below.

**Polish (non-blocking):**
- Anchor contract on Base mainnet (Sepolia verified; Railway needs `ANCHOR_*` + deploy).
- LogsPage "Proof" link UI (API + CLI exist; no per-row link in dashboard).
- Post-login wallet/network change not reconciled (low severity — confusing UI, not a session security hole).
- Stranger walkthrough (signup → key → first request) not explicitly verified end-to-end.

### Where we're going

Positioning: **"AWS for Web3"** — Web3-native infrastructure for autonomous AI agents. Phase 1 end state: an agent with zero prior relationship discovers LMX Cloud (x402 Bazaar/Agentic.Market, MCP, or ElizaOS plugin), pays per call in stablecoin, gets routed DePIN compute back. The underlying bet: hyperscalers and centralized neoclouds (CoreWeave, Lambda, etc.) have no margin incentive to ever route to decentralized supply, and DAOs/autonomous agents structurally can't use hyperscaler billing (no legal entity, no corporate card) — that combination is the wedge, not "decentralization" as a general pitch.

### What's left to build, roughly in order

0. ~~**Wallet squat fix on `POST /v1/auth/key`**~~ — **done 2026-07-07.**
1. **Week 3 legal** (Track B) — drafts published at `/legal/*`; **remaining:** attorney review. Hard gate before public listing. Can run in parallel with Sprint 3 — no engineering dependency.
2. ~~**x402 Sprint 1**~~ — **done 2026-07-07** (`docs/x402-*.md`, `GET /v1/pricing`, `payment_events` store).
3. ~~**x402 Sprint 2 close-out**~~ — **done 2026-07-08.** Paid Sepolia E2E + 10-run soak green; `payment_events` persistence confirmed.
4. **x402 Sprint 3 (current focus)** — **partially done.** Remaining:
   - **Mainnet paid canary** — swap to higher-throughput Base mainnet RPC, rerun `test:x402:mainnet-canary`, confirm `payment_events` row with `chain_id: 8453`.
   - **Abuse/load hardening** — replay protection landed; still need burst/load validation on anonymous x402 path.
   - **Payer visibility decision** — internal-only vs wallet-queryable per-call payment history; extend billing/usage UI if needed.
5. **Phase 1 Goal 1** — Bazaar + Agentic.Market listing (after legal + Sprint 3 mainnet canary green).
6. **Phase 1 Goal 2** — MCP server (**v1 shipped 2026-07-09** — balance-funded, hosted HTTP, 7 tools, E2E agent-tested; remaining: x402 per-call + registry listing).
7. **Phase 1 Goal 3** — ElizaOS plugin.
8. **Week 4 outreach prep** — depends on Web2-vs-Web3 sequencing decision.
9. **Polish** — mainnet anchor deploy, LogsPage proof link, distributed rate limiting if scaling past one instance.

### How to make the system better (engineering priorities)

1. **Green mainnet canary** — upgrade mainnet RPC, rerun `test:x402:mainnet-canary`, confirm `payment_events` on chain 8453. This is the immediate gate.
2. **Cloudflare edge hardening** (new, 2026-07-11) — DNS migration + proxy `api.lmxcloud.io`/`mcp.lmxcloud.io`, WAF, edge rate limiting, origin-lock code change. See dedicated section above. Gates Sprint 4 listing alongside legal.
3. **Finish Sprint 3 hardening** — load-test anonymous x402 path; decide payer visibility model.
4. **Legal before listing** — attorney review of Week 3 drafts unblocks Bazaar/MCP without unmanaged liability.
5. **Reliability ops** — uptime monitor confirmed; keep dedicated RPC on both Sepolia (dev) and mainnet (prod).
6. **Scale when needed** — Redis-backed rate limits + nonce store before second Railway instance.
7. **Trust signals** — mainnet anchor deploy, LogsPage proof links, public status page already strong from Web3-2.

### Explicitly not being built right now

Native token (legal counsel first), Virtuals/ACP + Autonolas + Fetch.ai + Bittensor (long tail), Stripe billing, SDKs beyond raw HTTP, multi-region infra, mobile/non-extension wallets.

## Week 1 — Deploy for real, close the security gap (DONE)

- ~~Delete `POST /v1/auth/login`~~ — done, verified in code.
- ~~Rotate `SESSION_SECRET`~~ — done, now required at boot.
- ~~Deploy API to Railway, dashboard + demo to Vercel~~ — done.
- ~~Add error monitoring + uptime check~~ — Sentry dependency present; confirm uptime monitor is actually configured (external, can't verify from code).
- ~~Re-check rate limits~~ — done, tightened defaults in place.
- ~~**CORS is currently `origin: true`**~~ — **decided 2026-07-06:** keep `origin: true`. Documented in snapshot; no code change needed.

## Week 2 — Make it usable by someone who isn't you (DONE)

- ~~API docs page~~ — `DocsPage.tsx` exists.
- ~~Streaming support~~ — implemented in `chat.ts`.
- **Expand model coverage** — partially done; confirm `together.ts` parity and that all aliased models actually work end-to-end.
- **Polish the signup → key → first request flow** — not explicitly verified; walk through it as a stranger would.
- ~~Public status page~~ — `StatusPage.tsx` exists.
- ~~Per-request logs~~ — `LogsPage.tsx` exists.

## Next sprint (updated 2026-07-08): x402 Sprint 3 close-out + attorney review in parallel

**Immediate next tasks, both parallel:** (1) **Mainnet paid canary** — upgrade Base mainnet RPC in `.env.mainnet` (current Alchemy free tier hits 429 under burst load), rerun `pnpm --filter @lmxcloud/api dev:mainnet` + `test:x402:mainnet-canary`, confirm `payment_events` row with `chain_id: 8453`. Payer wallet is funded; RPC throughput is the only remaining blocker. (2) **Attorney review** of Week 3 legal drafts at `/legal/*` — hard gate before Sprint 4 listing, zero engineering dependency.

**Sprint 3 progress so far (2026-07-08):** Sepolia RPC reliability done (dedicated endpoint, soak 10/10, configurable deposit log chunking). Partial abuse hardening (replay rejection, wallet-aware anon rate limits). Mainnet profile wired (`.env.mainnet`, `dev:mainnet`, `test:x402:mainnet-canary`, `check:mainnet-balance`); unpaid 402 on `eip155:8453` verified. Paid mainnet canary not yet green.

Web3-2 is done. **x402 Sprint 2 is done.** **Track A (x402)** is in Sprint 3 close-out. **Track B (legal)** is attorney review — last non-engineering gate before Sprint 4 (Bazaar/Agentic.Market listing). Remaining Web3-2 ops (mainnet anchor deploy, optional LogsPage proof UI) are non-blocking polish.

**Sequencing (2026-07-06): close the two small loose ends first, ToS/Privacy content after.**

**CORS decision, made:** keep `origin: true`. This isn't an oversight — for a public, OpenAI-compatible developer API, the security boundary is the Bearer API key, not same-origin policy. Third-party developers need to call this directly from their own browser-based apps, and you can't whitelist every origin that'll ever want to use LMX Cloud as a backend (same reason OpenAI/Anthropic's own APIs don't restrict CORS on key-authenticated endpoints). The one unauthenticated route, `POST /v1/auth/key`, is already IP-rate-limited (5/hour), which is the right mitigation for that specific route, not CORS. Documenting this closes the loose end — no code change needed.

**Together model parity — CORRECTION (2026-07-06): not actually a live issue.** `apps/api/src/config.ts`'s `optionalProvider("TOGETHER")` only activates the Together tier if `TOGETHER_API_KEY` is set — John confirmed Together isn't configured (costs money, deliberately not hooked up). So Together isn't in the live fallback chain at all right now; its model-map gap is inert, not a real reliability hole. Withdrawing this as a priority fix — flagged it twice without checking activation status first, that was a miss. **Resolved (2026-07-06): Akash is active.** `AKASHML_API_KEY`/`AKASHML_BASE_URL` confirmed set on Railway — real 2-tier fallback (io.net + Akash) in production, not a single point of failure. Together correctly absent, as expected.

**Confirmed (2026-07-06): Railway's `SIWE_CHAIN_ID`/`BASE_RPC_URL` are correctly set to Base mainnet values**, not the Sepolia testnet values used during local testing. Web3-1 is genuinely production-ready — all loose ends from the audit are now closed except Week 3 legal content, which is still outstanding.

## Week 3 — Trust and support basics

- [x] **Terms of Service + Privacy Policy** — beta drafts in `legal/` and web routes `/legal/terms`, `/legal/privacy` (2026-07-08). **Attorney review still required** before production launch.
- [x] **Acceptable use / abuse policy** — `legal/acceptable-use.md`, `/legal/acceptable-use`, linked from signup.
- [x] **Feedback channel** — `support@lmxcloud.io` (`/legal/contact`). Replace with Discord or ticketing when ready.
- [x] **Pricing FAQ one-liner** — on `/legal/contact` and `legal/README.md`.

## Week 4 — Outreach prep

- **Refresh landing copy** around the DePIN value prop specifically: cheaper/more resilient inference via decentralized compute, OpenAI-compatible so it's a drop-in swap. Lead with "get an API key in 30 seconds," link the live demo.
- **Line up first channels**: r/LocalLLaMA, Indie Hackers, AI-dev Discord/Twitter circles, and io.net/Akash community channels (they have an interest in a router that showcases their networks).
- **Run a private dry run first.** Get 2-3 friendly technical testers on the deployed version before the public post — this is where the login flow, rate limits, and error states get caught cheaply instead of publicly.
- **Basic funnel visibility.** You don't need an analytics platform yet — a couple of SQL queries against the Postgres store (signups → first key → first successful request → repeat usage) tells you if outreach is converting.

## Web3 positioning — "AWS for Web3" (decided 2026-07-06)

Direction: reposition LMX Cloud as Web3-native infrastructure, not a DePIN-backed dev tool with web2 UX. Audited the existing auth/credit code to find what these features actually build on:

- ~~`wallet` is never verified~~ — **fixed 2026-07-07:** unauthenticated `POST /v1/auth/key` no longer accepts `wallet`; SIWE and authenticated `POST /v1/auth/keys` are the only wallet-linking paths.
- `CreditStore.credit(apiKeyId, amount)` in `apps/api/src/credits/postgres-store.ts` is already the exact function a stablecoin deposit listener would call — no schema change needed, just a new caller instead of the manual `CREDITS_ALLOW_SELF_TOPUP` dev route in `routes/balance.ts`.
- An API key can already be minted with just a `wallet` string and no email (`POST /v1/auth/key`) — meaning agent self-sovereign key minting is nearly free once wallet claims are actually verified.
- ~~Nothing on-chain exists anywhere in the codebase~~ — **updated 2026-07-08:** Web3-1 added SIWE + USDC deposit polling; Web3-2 added `LmxLogAnchor` contract, Merkle batch anchoring, and proof API. x402 per-call payments are **verified end-to-end on Base Sepolia** (paid flow settles on-chain, `payment_events` persists as `completed`) — Sprint 2 done, Sprint 3 (mainnet + hardening) is next.

### Sprint Web3-1 — Wallet identity + stablecoin rails (foundational, do together)

**Chain: Base.** Decided 2026-07-06. x402 (the machine-payment standard Web3-3 will align to for agent payments) settles 85% of its ~167M transactions on Base, and the x402 Foundation includes Coinbase, Cloudflare, Google, Visa, AWS, Circle, Anthropic, and Vercel — building Web3-1 on Base means Web3-3 plugs in later with no bridging or second wallet stack. Also the more mature tooling path (SIWE, viem, Alchemy/Coinbase CDP) for a small team on a timeline. Trade-off named and accepted: this doesn't lean into io.net's Solana-community ties architecturally, but that angle can still be pursued in outreach/marketing without the payment rail living on Solana.

**Deposit model: shared treasury address.** One treasury wallet on Base receives USDC; incoming transfers are matched to an account by verified sender wallet address, not a per-user generated address. Simpler custody story for a beta — revisit a per-user address scheme only if volume demands the cleaner attribution.

**Identity linking: deferred.** A wallet-only account is a separate account from an email/Clerk account for this sprint — no "link your wallet to your existing account" flow yet. `listForRecord` in `apps/api/src/auth/store.ts` already branches on email-or-wallet, so this falls out naturally; unifying the two is real scope for later, not now.

**What Web3-1 actually builds:**

1. SIWE (EIP-4361) signature verification — two new endpoints, `POST /v1/auth/wallet/nonce` (issue a challenge tied to an address) and `POST /v1/auth/wallet/verify` (verify the signed message, find-or-create the `ApiKeyRecord` by wallet, issue a session token) — mirrors the existing `POST /v1/auth/clerk` exchange pattern in `apps/api/src/routes/auth.ts`.
2. Both endpoints must be callable by a script holding a raw keypair, not just a browser wallet extension — this is what makes a key agent-mintable, not just human-wallet-mintable, and is the on-ramp for Web3-3.
3. Frontend: a "Connect Wallet" option next to Clerk on `SignInPage.tsx`/`SignUpPage.tsx` using standard EVM wallet-connect tooling (wagmi/viem + RainbowKit or ConnectKit).
4. A treasury USDC deposit address on Base, plus an on-chain listener (webhook or polling job against an RPC/indexer) that matches confirmed incoming transfers to a verified wallet's account and calls the existing `CreditStore.credit()` in `apps/api/src/credits/postgres-store.ts` — this function needs no changes, just a new caller replacing the dev-only `CREDITS_ALLOW_SELF_TOPUP` route in `routes/balance.ts` as the real funding mechanism.
5. A sensible confirmation-count threshold before crediting, to avoid crediting a balance that a chain reorg later reverses.

**Definition of done:** a wallet (human via browser extension, or agent via raw keypair script) can sign a challenge, receive a session/API key with no email involved, send USDC on Base to the treasury address, and see its credit balance update automatically without any manual top-up step.

**Status: VERIFIED END-TO-END ON BASE SEPOLIA (2026-07-06).** SIWE wallet sign-in (no email/Clerk involved) and the USDC deposit → auto-credit flow both confirmed working against testnet by hand. Config defaults to Base mainnet (`SIWE_CHAIN_ID=8453`, mainnet USDC contract) — this was overridden to Sepolia values for testing and needs to be flipped back to mainnet values before real production use.

### Web3-1 hardening pass — smoother UX (decided 2026-07-06)

**Status: DONE, verified in code 2026-07-06.** Checked `WalletConnectButton.tsx`, the new `useWalletSignIn.ts` hook, and `BillingPage.tsx` directly:
- ~~No live refresh~~ — done. `BillingPage` now has adaptive-interval polling (starts at 5s, backs off to 30s) while any deposit is pending, plus a visibility-change listener that refreshes immediately when the tab regains focus. Shows a "Watching for confirmations" banner while active.
- ~~No wrong-network handling~~ — done. `useWalletSignIn` exposes `wrongNetwork`/`switchToTargetChain`, with distinct button states for connecting/switching/signing (`walletSignInButtonLabel`).
- ~~Connecting vs. signing aren't distinguished~~ — done, same hook: phases are `idle → connecting → switching → signing`, each with its own button label ("Connecting…", "Switching network…", "Confirm in wallet…").
- ~~"Unmatched" deposits have no resolution path~~ — done. `BillingPage` shows a clear banner: sign in with the sending wallet if it was a mistake, or contact support with the tx hash for manual crediting.
- **Partially open:** wallet-side account/network changes *after* a session is already established aren't actively reconciled — `useWalletSignIn`'s reactive wagmi state handles this well pre-login (switching networks before signing in), but nothing forces re-authentication if the connected wallet changes *after* `sessionReady` is already true. Low-severity (worst case is a confusing UI state, not a security issue, since the session token itself was already validated), but not fully closed.
- Mobile/non-extension wallets: still not supported, as expected (deferred by design).

### In-console "Add Credits" (decided 2026-07-06)

**Status: DONE, verified in code.** `AddCreditsCard` component exists and is wired into `BillingPage.tsx` for wallet accounts only, feeding into the same polling/confirmation system above via `onDepositSubmitted`. Also found `deposits/limits.ts` with a `MIN_DEPOSIT_USDC`/max deposit guard that wasn't explicitly requested — Cursor added sensible dust/ceiling limits on its own.

## Documentation refresh (decided 2026-07-06, before Web3-2)

Paused Web3-2 to fix a real gap found while reviewing `DocsPage.tsx` and `README.md`: neither mentions *any* Web3 functionality. README is actually more current than expected on the model/API side (documents 30 model aliases, streaming, the docs/status pages), but both docs surfaces still describe LMX Cloud purely as a "DePIN Inference Router" with zero mention of wallet auth (SIWE), USDC deposits, or the agent-mintable key path — all of which are live in production. Also missing: any conceptual explanation of the broader vision, and a public-facing roadmap. Scope: update `DocsPage.tsx` with a conceptual overview section, a wallet-authentication section, a USDC-funding section, and a curated public roadmap section (not a copy-paste of this internal file's audit trail — written for outside readers). Refresh `README.md`'s positioning and document the currently-undocumented Web3-1 env vars.

### Sprint Web3-2 — Verifiable on-chain logs (DONE 2026-07-07)

**Goal:** make LMX Cloud's routing/latency/cost claims independently verifiable, not just numbers displayed in a dashboard you control. Right now a skeptical developer has to trust `LogsPage.tsx`; Web3-2 lets them cryptographically check that a log entry hasn't been altered after the fact.

**Two pieces:**
1. **Per-request receipt.** Hash the deterministic metadata fields of each `usage_events` row (provider, model, tokens, cost, latency, timestamp — NOT prompt/response content, metadata only, for privacy) into a receipt hash, stored alongside the row.
2. **Batched Merkle anchoring.** Periodically (time- or count-based batch, same pattern as the deposit poller's interval config) build a Merkle tree from recent receipt hashes and anchor just the root on Base.

**Real decision, made:** anchor via a minimal purpose-built smart contract (`anchor(bytes32 root)` + event), not a plain transaction with calldata. Barely more engineering with viem already in place, and dramatically more credible to an outside auditor — "here's our contract on Basescan, here's every root we've published" is a real trust signal; an obscure transaction's calldata is not.

**Scope for this sprint:** on-chain anchoring, a `GET /v1/usage/logs/:id/proof` endpoint returning the Merkle proof for a given log entry, and surfacing the contract address + recent anchored roots on the already-public `StatusPage.tsx`. A polished "verify this receipt yourself" UI is a nice-to-have, not required — Cursor's call on how far to take it. Historical log rows from before this ships won't be retroactively verifiable, only new ones going forward.

**Status: SHIPPED AND VERIFIED END-TO-END ON BASE SEPOLIA (2026-07-07).** Implemented in three PRs: (1) `lmx_receipt_v1` canonical receipt + `receipt_hash` on `usage_events`; (2) `contracts/LmxLogAnchor.sol`, anchor poller/store/merkle, `pnpm deploy:anchor`; (3) proof API, status `anchoring` object, `StatusPage.tsx` card, `pnpm verify:receipt`. Confirmed locally: chat completion → batch claimed → on-chain tx → proof `status: anchored` → CLI verification passes (receipt hash, Merkle proof, `anchoredAt` on contract). Production mainnet anchor deploy not yet done — Railway needs `ANCHOR_*` env vars + mainnet contract when ready.

## Phase 1 distribution goal (decided 2026-07-06): "findable and payable" by autonomous agents

This replaces the old vague "Web3-3" stub. Phase 1 is done when an autonomous agent — zero human in the loop, no prior relationship with LMX Cloud — can discover LMX Cloud through at least one of three specific channels, pay per call in stablecoin, and get routed DePIN compute back. Everything before this point is infrastructure; this is the first point real, un-prompted revenue can show up.

**Why these three channels, in this order:** the first is protocol-level (works for any agent using the x402 payment standard, regardless of what framework built it), the second is the widest possible net (any MCP-compatible agent — Claude, ChatGPT agents, custom LangChain agents — not just crypto-native ones), the third is framework-specific and highest-touch, best used as a proof-of-concept case study once the payment plumbing from the first two is already working. Virtuals (ACP) is deliberately not in this list — its commerce layer is bespoke (on-chain jobs/escrow, not confirmed to run over x402), meaningfully heavier to build against, and not worth the lift until Phase 1 proves agents actually pay for this at all.

**Prerequisite that blocks all three goals: real x402 per-call payments.** Today's Web3-1 flow is deposit-then-spend-a-balance (fund an account, draw it down over many requests). x402 and the discovery layers built on it (Bazaar, Agentic.Market, MCP) expect pay-per-request: an agent gets an HTTP 402 response with a price, pays that specific call, gets the result. This is additive, not a replacement — the existing balance-funded flow stays for dashboard/human users. The new piece is a 402 response + payment-verification step on the paid inference routes, reusing the existing treasury wallet and `CreditStore` plumbing from Web3-1 rather than building new payment infrastructure from scratch.

### Goal 1 — x402 Bazaar + Agentic.Market listing

Build per-call x402 payment support on the inference endpoints (starting with `chat.ts`'s completions route), verify payment before routing to io.net/Akash as already built, then submit the resulting endpoint to Coinbase's Bazaar discovery catalog and to the Agentic.Market directory.

**Definition of done:** an agent with zero prior relationship to LMX Cloud finds it by searching Bazaar or Agentic.Market for inference/compute, pays for a single call in stablecoin, and gets a routed response back — no signup, no API key, no pre-funded balance.

### Goal 2 — MCP server

**Shipped (v1, 2026-07-09):** hosted Streamable HTTP MCP at `https://mcp.lmxcloud.io/mcp` with per-user `Authorization: Bearer lmx_...` passthrough, rate limits, and structured caller logging. Seven tools cover the full agent lifecycle on the existing balance-funded API:

| Tool | Purpose |
|------|---------|
| `get_status` | Provider health + fallback chain |
| `list_models` | Live model catalog |
| `get_pricing` | Full pricing catalog |
| `quote_price` | Single-call USDC estimate |
| `get_balance` | Caller credit balance |
| `get_usage` | Caller usage totals |
| `chat_completion` | Run inference (bills caller's key) |

**E2E validated:** external demo repo agent ran the full 6-step smoke suite (status → models → quote → balance → completion → usage) through MCP.

**Still open for Goal 2 "done":**
- Wrap the x402 per-call endpoint from Goal 1 (today MCP uses pre-funded API key balance, not pay-per-request stablecoin).
- Publish/discover in the MCP registry ecosystem (Bazaar listing gate still applies).

**Definition of done (full Goal 2):** any MCP-compatible agent can discover LMX Cloud through the MCP registry ecosystem and call it as a paid tool, using the same per-call payment flow as Goal 1.

### Goal 3 — ElizaOS plugin

Build a model-provider plugin against the existing OpenAI-compatible endpoint, with wallet-based key minting wired into plugin setup (reusing the raw-keypair mint flow already shipped in Web3-1 — no new auth work needed). Submit it to the `elizaos-plugins/registry` (an `index.json` entry via PR).

**Definition of done:** an ElizaOS developer installs the plugin, points it at a wallet or keypair, and their agent's inference is funded and routed through LMX Cloud with no manual signup step. Deliberately last — most framework-specific, best positioned as a reference case study once Goals 1-2 prove the underlying payment flow actually works.

**Explicitly out of scope for Phase 1:** Virtuals/ACP, Autonolas, Fetch.ai, Bittensor. Longer tail, bespoke integrations each — revisit only once Goals 1-3 show real traffic.

**Hard blocker, elevated again: Week 3 legal.** Going live on public discovery catalogs means strangers' autonomous agents transacting real stablecoin against LMX Cloud with zero signup and zero prior relationship — a materially bigger exposure than the free-beta dev signup Week 3 was originally scoped for. ToS, privacy policy, and acceptable-use content must close before or in parallel with Goal 1 shipping, not after.

**Success metric for Phase 1:** the first real, un-prompted x402 payment from a wallet LMX Cloud has never seen before, routed successfully to io.net or Akash and settled. That single event is the proof-of-life signal that distribution works — everything upstream of it is plumbing, not revenue.

**Native token — still deferred by design**, unchanged from before, after Phase 1 once there's real usage/treasury data. "Governance + economic rights" token language is securities-law surface area (Howey-test territory) — legal counsel before any public token language, not an engineering task.

**Open question, still unresolved:** does Phase 1 replace the current dev-first free-beta plan (Weeks 3-4 above), or run as a parallel track? Web2 (Clerk) and Web3 (wallet) users can coexist under Web3-1's design, but Week 4 outreach copy/channel choice should reflect whichever way this leans.

## Phase 1 sprint plan (added 2026-07-06): execution breakdown

The Phase 1 section above is the *what and why*. This is the *when* — six sprints from here to "listed on a distribution network and actually collecting money," with measurable done-criteria per sprint. Named "Distribution Sprint" to avoid clashing with the existing Week 1-4 labels above, which are a separate (mostly already-done) track. Three tracks run across these sprints: **Track A** (payment plumbing → the three distribution goals, sequential, blocking), **Track B** (legal, parallel, must close before Sprint 4's public listing), **Track C** (Web3-2 verifiable logs — **done 2026-07-07**, was a trust/conversion booster ahead of Sprint 4 listing).

### Distribution Sprint 1 — Decisions + foundations

- [x] **Security:** remove unverified `wallet` from unauthenticated `POST /v1/auth/key` (wallet keys via SIWE only). Done 2026-07-07.
- [x] Decide per-call pricing (dollar amount per model/token, documented in one place both docs and the eventual Bazaar listing will pull from). See `docs/x402-pricing.md` and `GET /v1/pricing`.
- [x] Decide payment verification approach: self-verify the on-chain transaction vs. use Coinbase's CDP facilitator — document the trade-off actually made, not just the options. See `docs/x402-verification.md` (CDP Facilitator chosen).
- [x] DB migration: add a per-call payment-event record distinct from the existing balance-credit rows, so a payment can be reconciled against the specific inference call it paid for. `payment_events` table + `usage_events.payment_event_id`.
- [ ] Confirm the uptime monitor (UptimeRobot/Better Stack) is actually configured — long-open item, now matters more since Bazaar's discovery ranking factors reliability.
- [x] (Track B, parallel) ToS / privacy / acceptable-use drafts — `legal/` + `/legal/*` (2026-07-08).
- [x] ~~(Track C) Web3-2 receipt hashing~~ — done (`lmx_receipt_v1`, `usage_events.receipt_hash`).

### Distribution Sprint 2 — x402 per-call payments (Track A)

- [x] Implement 402 Payment Required response + payment verification on the paid inference routes (`chat.ts` first), per Sprint 1's decision. `@x402/fastify` middleware + `upto` scheme; dual path with Bearer auth for balance users.
- [x] Reconciliation logic: auto-refund or credit-back when payment succeeds but the downstream io.net/Akash call fails — payment cancellation on handler 4xx/5xx via x402 middleware; partial settlement via `setSettlementOverrides` for actual token cost.
- [x] **End-to-end test on Base Sepolia (2026-07-08).** Unpaid probe green (`pnpm test:x402` → 402 in ~30ms) and paid path (`pnpm test:x402 -- --pay`) verified end-to-end: verify → inference → settle with a `payment_events` row written.
- [x] (Track B) Legal draft ready for review — published at `/legal/*`; counsel review pending.
- [x] ~~(Track C) Web3-2: batched Merkle anchoring live on testnet~~ — done (Sepolia verified 2026-07-07).

### Distribution Sprint 3 — Production hardening

- [x] **RPC reliability close-out on Sepolia (2026-07-08).** Dedicated Base Sepolia RPC configured; paid soak (`pnpm test:x402 -- --pay --repeat 10 --delay-ms 1000`) green; deposit poller no longer throws provider block-range errors after `DEPOSIT_MAX_LOG_BLOCK_RANGE` env + one-time fallback retry.
- [x] **x402 abuse hardening (partial, 2026-07-08).** Replay rejection for consumed payment payloads (`409` / `x402_payment_replay`); wallet-aware anonymous rate-limit keys; `X402_ANON_RATE_LIMIT_*` env support. Soak test harness (`test:x402:soak`, `--repeat`, `--delay-ms`).
- [x] **Mainnet profile wired (2026-07-08).** `.env.mainnet` + `LMX_ENV=mainnet` loading; `dev:mainnet`, `test:x402:mainnet-canary`, `check:mainnet-balance` scripts; unpaid 402 on `eip155:8453` with mainnet USDC asset verified; payer wallet funded on Base mainnet.
- [ ] **Mainnet paid canary green.** Blocked on Alchemy RPC 429 (compute-units/sec limit) during Permit2 approval / balance reads — not wallet funding. Upgrade RPC or swap provider in `.env.mainnet`, rerun canary, confirm `payment_events` row with `chain_id: 8453` and mainnet tx hash.
- [ ] Abuse/load-test the now-fully-public payment endpoint under burst traffic (replay protection landed; formal load validation still needed).
- [ ] Portal: extend billing/usage views to show per-call payment records, not just balance draws — decide explicitly whether anonymous (no-session) x402 payments get any payer-visible record at all, or are purely internal-ops visibility.
- [x] (Track B) Legal published and linked from signup + docs — **counsel review still required before Sprint 4 listing gate.**
- [x] ~~(Track C) Web3-2: `GET /v1/usage/logs/:id/proof` endpoint live, contract address + recent roots surfaced on `StatusPage.tsx`~~ — done.
- [ ] (Track C, optional) Deploy anchor contract on Base mainnet + set `ANCHOR_*` on Railway; optional LogsPage proof link.

### Cloudflare edge hardening (decided 2026-07-11, gates Sprint 4 listing)

**Why now:** Sprint 4 puts `api.lmxcloud.io` and `mcp.lmxcloud.io` in front of strangers' autonomous agents with zero prior relationship — public discovery catalog traffic, no signup gate. Today both are bare Railway domains with no edge protection: no DDoS absorption, no WAF, no rate limiting that survives a redeploy. Cloudflare closes this before listing, not after.

**Scope, decided:** Cloudflare sits in front of the API + MCP server only (`api.lmxcloud.io`, `mcp.lmxcloud.io` on Railway). The dashboard (`apps/web` on Vercel) already has Vercel's own edge network and is lower-risk (human/browser traffic, Clerk-gated) — not in scope for this pass.

**Plan:**
1. ~~**DNS migration.**~~ **Done 2026-07-12.** `lmxcloud.io` purchased directly through Cloudflare Registrar — zone is active on Cloudflare from day one, no nameserver migration needed.
2. **Proxy the Railway custom domains through Cloudflare.** `api.lmxcloud.io` and `mcp.lmxcloud.io` become Cloudflare-proxied (orange-cloud) CNAMEs pointing at the existing Railway-generated domains (DEPLOY.md already documents these as "optional custom domain" — this makes them non-optional). SSL/TLS mode: Full (Strict), since Railway terminates TLS on its own domain already.
3. **WAF.** Enable Cloudflare Managed Rules (OWASP core ruleset) on both subdomains.
4. **Edge rate limiting.** Add Cloudflare rate-limiting rules as a second layer on top of the existing app-level limits (`KEY_GEN_RATE_LIMIT_MAX`, `CHAT_RATE_LIMIT_MAX`) — edge rules survive Railway redeploys and multi-instance scaling, which the in-memory app limiter doesn't. Particularly worth tightening on `POST /v1/auth/key` (the one unauthenticated route).
5. **Bot management — use carefully.** Cloudflare's Bot Fight Mode / Super Bot Fight Mode is designed to block the exact traffic pattern LMX Cloud is about to court on purpose (autonomous agents, no browser, no human). Do not enable aggressive bot-blocking on `api.lmxcloud.io`/`mcp.lmxcloud.io` without allowlisting for legitimate non-browser clients — this is a real footgun for Sprint 4's actual goal. DDoS protection and WAF are unconditionally safe to enable; bot scoring is not.
6. **Origin lock (code dependency — see Cursor prompt).** Once Cloudflare is in front, the raw Railway domains (`*.up.railway.app`) still resolve directly and bypass all of the above. Needs an origin-side check so the API/MCP server reject traffic that didn't come through Cloudflare.

**Status: in progress (2026-07-12).** Step 1 (domain + zone) done. DNS records added in Cloudflare: apex + `www` → Vercel (DNS only), `api`/`mcp` → Railway (proxied). `api.lmxcloud.io` and `www.lmxcloud.io`/`lmxcloud.io` **verified live end-to-end** (Vercel shows Valid Configuration on both, dashboard serves correctly, `GET https://api.lmxcloud.io/health` returns 200). `VITE_API_URL`, `SIWE_DOMAIN`, `SIWE_URI` updated to match the new domain (Vercel redeploy + Clerk allowed-origins update still need confirming next session). Edge rate limiting **done**: `auth-key-limit` rule deployed (10 req/hour per IP on `/v1/auth/key`, block 1hr). **WAF managed rules deferred** — OWASP Managed Ruleset requires Cloudflare Pro ($20/mo), John chose to skip for now; relying on automatic DDoS protection + the rate-limit rule instead. Revisit before Sprint 4 listing if budget allows. **Blocker unchanged:** Railway trial plan caps custom domains at 1 — `mcp.lmxcloud.io` still can't be added until Railway is upgraded (Hobby, ~$5/mo), deferred. Bot Fight Mode check not yet confirmed. Step 6 (origin lock) needs a Cursor prompt — see engineering priorities, not yet run.

### Distribution Sprint 4 — Goal 1: x402 Bazaar + Agentic.Market listing

- [ ] Listing metadata, pricing, and schema prepared — same source of truth as the docs page, not maintained twice.
- [ ] Submitted to Bazaar's discovery catalog.
- [ ] Submitted to Agentic.Market directory.
- [ ] Confirm listing is live and actually searchable/found by a test query.
- [ ] **Success metric, watch for:** first real, un-prompted x402 payment from a wallet LMX Cloud has never seen before, routed and settled successfully.

### Distribution Sprint 5 — Goal 2: MCP server

- [x] Build MCP server — balance-funded v1 at `apps/mcp-server`, hosted HTTP on Railway, 7 tools (`get_status`, `list_models`, `get_pricing`, `quote_price`, `get_balance`, `get_usage`, `chat_completion`).
- [x] Per-user API key passthrough via `Authorization` header (server `LMX_ADMIN_API_KEY` fallback only).
- [x] Tested end-to-end with a real MCP client agent (6-step smoke suite passed in external demo repo).
- [x] Docs + console keys page MCP onboarding (`/docs#mcp`, Keys "Use with MCP" config copy).
- [ ] Wrap x402 per-call payment endpoint when Goal 1 ships (upgrade `chat_completion` to support 402 flow).
- [ ] Published/discoverable in the MCP registry ecosystem.

### Distribution Sprint 6 — Goal 3: ElizaOS plugin

- [ ] Build the model-provider plugin (wraps the existing OpenAI-compatible endpoint, wires in wallet-based key minting from Web3-1).
- [ ] PR submitted to `elizaos-plugins/registry`.
- [ ] Tested end-to-end with a real ElizaOS agent instance.

## Phase 2 — settlement + proof layer for the agent economy (revised 2026-07-11)

**What LMX Cloud is, directionally — the operating thesis this section builds from:** LMX Cloud is the settlement and proof layer for the agent economy — infrastructure that lets an autonomous agent with no human, no legal entity, and no corporate card discover a resource, pay for it per-call in stablecoin, and cryptographically prove it was delivered. Two layers, different competitive position each:

- **Execution layer** (the "AWS" surface) — resource-agnostic routing via the `ProviderAdapter` pattern (`apps/api/src/providers/`): compute (io.net/Akash, done), storage (Filecoin/Arweave, Goal 1 below), and eventually third-party/agent-authored functions (Goal 2 below).
- **Trust layer** (what's actually defensible) — settlement (x402 per-call payment) + proof (Merkle-anchored delivery receipts, Web3-2). Payment alone is not a moat — Coinbase's CDP Facilitator already owns that and LMX builds on top of it (`docs/x402-verification.md`). Discovery alone is not a moat — Coinbase's real CDP Bazaar already has the liquidity (165M+ cumulative x402 transactions, 480K+ agents, ~$50M+ volume as of April 2026, per Chainalysis / x402 Inc. reporting). **Proof of delivery is the wedge** — cryptographic evidence a specific call was fulfilled as specified, independently checkable. Nobody else surveyed in this space has built that layer.

**Correction for the record (2026-07-11):** `x402bazaar.org` is *not* Coinbase's product — it's an independent, single-operator clone (GitHub user "Wintyx57") built on the open x402 protocol, near-zero traction observed (0 txns on its SKALE listing). Don't confuse it with the real CDP Bazaar discovery layer LMX lists on in Sprint 4. Its existence is still a useful data point: a bare directory + payment wrapper is trivially cloneable by one person in a weekend, which confirms neither layer alone is a moat and reinforces that verified delivery is the differentiated one.

**Explicit non-goals, restated so this doesn't drift again:** LMX does not compete with Bazaar as a directory. LMX does not compete with CDP Facilitator on payment verification. LMX does not claim to verify the *correctness* or quality of a third party's function output — only that the call happened and the response matched what was declared, hashed and timestamped, anchored on-chain. That precision matters for Week 3 legal: "verified delivery" is a defensible claim; "verified correct" is liability exposure for someone else's function that LMX shouldn't take on.

**Sequencing note, reaffirmed:** Phase 2 doesn't start until Phase 1's payment flow is fully live (Sprint 3 mainnet flip + Sprint 4 Bazaar listing). AWS's own history backs extra caution specifically on datasets — AWS Marketplace shipped in 2012, Lambda in 2014, but AWS Data Exchange (a dataset marketplace) didn't ship until 2019, thirteen years after launch, once the trust/billing/identity layer was completely proven out. Datasets stay explicitly out of scope for the same reason: no verification/anti-redistribution model exists yet for "prove a dataset was delivered without also enabling it to be copied and resold."

### Phase 2 Goal 1 — Storage routing (the "S3" of LMX)

Route agent requests for storage/memory (files, logs, embeddings) to decentralized storage networks (e.g. Filecoin, Arweave) the same way inference requests already route to io.net/Akash — same `ProviderAdapter` pattern, same per-call x402 pricing/verification, same receipt/Merkle anchoring for proof of delivery.

**Definition of done:** an agent can pay per-call (or per-byte/per-period) to store and retrieve data through LMX Cloud, routed to at least one decentralized storage network, with a verifiable receipt the same way inference calls get one today.

### Phase 2 Goal 2 — Callable function registry (Marketplace + Lambda, merged 2026-07-11)

**Revised framing:** originally scoped as two separate goals — "open the rails to other sellers" (Marketplace) and "widen job types routed" (the "Lambda" of LMX, see retired Goal 3 below). Collapsing these: a listed marketplace seller and a callable function are the same object once distribution runs through the MCP server. The MCP server (Phase 1 Goal 2, v1 shipped 2026-07-09) stops being "LMX's own 7 tools" and becomes a registry — any wallet-verified provider, including an agent itself, registers a function (manifest: description, input/output schema, price, endpoint), and any MCP-compatible agent discovers and calls it the same way it calls LMX's built-in tools today.

**Agents as first-class citizens, applied concretely:** the registrant doesn't have to be a company. This reuses the Web3-1 self-mint pattern (wallet-signed, no human review) — an agent good at some task can list its own skill and sell it to other agents. That's the differentiated end-state; every comparable product surveyed (CDP Bazaar, x402bazaar.org, RelAI) assumes sellers are companies and agents are only buyers.

**Anti-abuse, mechanical gates only, no human curation:** (1) a synthetic test call LMX makes once at registration to confirm the function responds and matches its declared schema before going live; (2) a small refundable USDC bond, slashed on verified bad behavior (schema mismatch, receipt anomalies, buyer disputes). Consistent with wallet-native self-serve onboarding — avoids reintroducing a human review bottleneck.

**Open technical question, unresolved:** for a function backed by a third party's own webhook (not LMX-routed compute), what can the receipt actually attest? LMX only sees what the provider chooses to return — the receipt can say "a call was made, this was the response, hashed and timestamped," nothing about the provider's backend. Whether that thin a guarantee is still a sellable trust signal is untested.

**Revenue model, open:** the old "LMX earns a cut of agent-originated revenue" assumed a marketplace take-rate on GMV. If LMX isn't routing the underlying resource — just settling and receipting a third party's call — a flat or usage-based infra fee (pricing the receipt/anchoring service itself) may be the more honest model. Decide before sizing Goal 2 revenue projections.

**Scope correction:** this is a bigger product commitment than Distribution Sprint 5's current sizing ("ship 7 tools, wire x402, get in registry"). "MCP is the flagship product" implies an ongoing surface — seller/listing dashboard, an in-MCP discovery tool (agents need to search LMX's own registry, not just Bazaar's), health monitoring on every listed function, a delisting/dispute flow. Not a sprint; a product line. Needs an explicit resourcing decision, not folded silently into Sprint 5/6 as currently scoped.

**Definition of done (revised):** a wallet-verified provider — human-operated or agent-operated — can register a function with a price and schema through LMX's MCP registry; any MCP-compatible agent can discover and call it through LMX's existing MCP surface; LMX settles payment (x402) and issues a delivery receipt, without vetting the function's output quality.

### Phase 2 Goal 3 — retired, folded into Goal 2 (2026-07-11)

Previously "widen job types routed (the Lambda of LMX)." Superseded — see the Goal 2 merge above. A new job type (embeddings, fine-tuning, image generation) is now just another function in the registry, whether LMX-operated or third-party.

### Phase 2 sprint plan (directional, added 2026-07-11 — not yet scoped for real execution; Phase 1 must close first)

- **Platform Sprint 1 — Storage routing (Goal 1).** Filecoin/Arweave adapter, same x402 + receipt pattern as compute.
- **Platform Sprint 2 — MCP registry foundations.** Manifest schema (description, input/output schema, price, endpoint), wallet-signed self-registration reusing the Web3-1 mint pattern, synthetic test-call gate.
- **Platform Sprint 3 — Trust mechanics.** Refundable USDC bond + slashing logic, resolve the third-party/webhook receipt guarantee question above, delisting/dispute flow.
- **Platform Sprint 4 — Seller product surface.** Listing/seller dashboard, in-MCP discovery tool, health monitoring on listed functions.
- **Platform Sprint 5 — Agent-as-seller pilot.** Get one real agent-authored function listed and transacted end-to-end as proof of the "agents as first-class citizens" thesis, before opening broadly.

Open questions carried forward into scoping: revenue model (take-rate vs. infra fee), whether the unresolved receipt-guarantee question blocks webhook-backed listings entirely, whether the mechanical-only review gate holds up at real abuse volume.

**Explicitly not Phase 2:** dataset marketplace — deferred per the AWS Data Exchange sequencing note above, no verification/anti-redistribution model exists yet. Reputation/trust-scoring products (e.g. feeding receipts into ERC-8004 or similar emerging standards) — revisit once Phase 2 has real multi-resource transaction volume to make that data meaningful. Treasury/spend-policy management for agents — adjacent territory already being built by others (PolicyLayer, Eco, AWS Bedrock AgentCore); not a near-term fit unless narrowly scoped to cross-provider compute/storage spend specifically.

## Deliberately deferred (not blocking beta)

- Real payments/Stripe billing — free beta means the dev credit top-up is fine for now.
- Wallet/crypto-native auth beyond the existing `wallet` field.
- SDKs beyond raw HTTP — a docs quickstart is enough until there's demand.
- Multi-region/high-availability infra — a single Railway deployment is fine at beta scale.

## Suggested order if the timeline compresses

If 3-4 weeks becomes 1-2: do the login fix, the real deploy with Postgres, and basic monitoring — then go straight to a small private dry run. Docs, streaming, and model coverage matter for *growth* but won't stop a handful of trusted early users from getting real signal.
