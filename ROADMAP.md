# LMX Cloud — Roadmap

Original goal: go from working proof-of-concept (Phase 1-7) to something you can hand to strangers — developers trying it for free — without it breaking, leaking data, or embarrassing you. That base layer is done. The roadmap has since grown a second, bigger goal on top of it: reposition as Web3-native infrastructure and become "findable and payable" by autonomous agents (Phase 1 distribution, below). Both tracks are tracked in this one file — free-beta hardening didn't stop mattering, it's just no longer the only thing happening.

## CURRENT STATE SNAPSHOT (2026-07-07, evening audit) — read this first

Everything below is verified directly against the code, not assumed from memory or from what Cursor's own summaries claimed. This section supersedes the blow-by-blow notes further down for a quick read; the detailed sections below stay as the record of *why* each decision was made.

### Built so far

- **Core inference router** — multi-provider routing (io.net + Akash both active on Railway; Together deliberately not configured), health-aware fallback, streaming chat completions (real SSE), 30 model aliases. Credits deduct *after* successful inference, not before.
- **Security/ops baseline** — old account-takeover login route deleted, `SESSION_SECRET` required at boot in production, rate limits (5 keys/hour per IP, 30 chat/min per key), Sentry fully wired (init + global error handler). CORS decision documented: keep `origin: true` for OpenAI-compatible public API; Bearer token is the security boundary.
- **Full dashboard** (`apps/web`) — overview, keys, usage, per-request logs, public status page, billing, docs page.
- **Web3-1: wallet identity + USDC funding on Base — shipped, hardened, verified end-to-end.** SIWE sign-in (browser or raw keypair script), Clerk as alternate auth, USDC deposits auto-crediting via confirmation-gated poller, in-console "Add Credits" flow, adaptive billing refresh, wrong-network detection, unmatched-deposit guidance. Railway confirmed on Base mainnet config (`SIWE_CHAIN_ID`, `BASE_RPC_URL`).
- **Web3-2: verifiable on-chain logs — shipped, verified end-to-end on Base Sepolia (2026-07-07).** Per-request `lmx_receipt_v1` receipts, batched Merkle anchoring via `LmxLogAnchor` + background poller, `GET /v1/usage/logs/:id/proof`, anchoring on `GET /v1/status` and `StatusPage.tsx`, `pnpm verify:receipt` CLI, unit tests for receipt/Merkle/proof. Historical logs before enablement are not retroactively verifiable.
- **Documentation refresh** — `README.md` and `DocsPage.tsx` describe Web3 direction, wallet auth, USDC funding, verifiable logs, and public roadmap section.

### Known gaps / needs hardening (verified 2026-07-07 evening)

**Security — fix before more money flows:**
- ~~**Wallet squat on `POST /v1/auth/key` (HIGH).**~~ **Fixed 2026-07-07.** Unauthenticated key mint no longer accepts a `wallet` field; wallet-linked keys require SIWE (`/v1/auth/wallet/verify`) or authenticated `POST /v1/auth/keys`.

**Hard blockers for Phase 1:**
- **Week 3 legal** — ToS, privacy policy, acceptable use, feedback channel. Not started; no legal content in repo or web app. Hard gate before Bazaar/Agentic.Market listing.
- **x402 per-call payments** — not built. Today is deposit → balance → deduct; agents expect pay-per-request with machine-readable 402. Blocks all three Phase 1 distribution goals.
- **Payment failure reconciliation** — no refund/credit-back path when payment succeeds but io.net/Akash fails. Required for x402; doesn't exist for balance flow either on provider failure after deduct.

**Ops / scale (fine for single-instance beta, harden before scaling):**
- Rate limiter and SIWE nonce store are in-memory — reset on deploy, ineffective across multiple Railway instances.
- Uptime monitor (UptimeRobot/Better Stack) — can't verify from code; confirm externally.
- Streaming edge case: if stream completes but final `deduct` fails, client already received tokens with no recovery.

**Polish (non-blocking):**
- Anchor contract on Base mainnet (Sepolia verified; Railway needs `ANCHOR_*` + deploy).
- LogsPage "Proof" link UI (API + CLI exist; no per-row link in dashboard).
- Post-login wallet/network change not reconciled (low severity — confusing UI, not a session security hole).
- Stranger walkthrough (signup → key → first request) not explicitly verified end-to-end.

### Where we're going

Positioning: **"AWS for Web3"** — Web3-native infrastructure for autonomous AI agents. Phase 1 end state: an agent with zero prior relationship discovers LMX Cloud (x402 Bazaar/Agentic.Market, MCP, or ElizaOS plugin), pays per call in stablecoin, gets routed DePIN compute back. The underlying bet: hyperscalers and centralized neoclouds (CoreWeave, Lambda, etc.) have no margin incentive to ever route to decentralized supply, and DAOs/autonomous agents structurally can't use hyperscaler billing (no legal entity, no corporate card) — that combination is the wedge, not "decentralization" as a general pitch.

### What's left to build, roughly in order

0. ~~**Wallet squat fix on `POST /v1/auth/key`**~~ — **done 2026-07-07.**
1. **Week 3 legal** (Track B, parallel) — hard blocker for public listing.
2. **x402 Sprint 1** — per-call pricing, verification approach decision, `payment_events` DB migration.
3. **x402 Sprint 2** — 402 response + payment verification on `chat.ts`, reconciliation logic, Sepolia E2E test.
4. **x402 Sprint 3** — mainnet config, abuse/replay protection, anonymous rate limits.
5. **Phase 1 Goal 1** — Bazaar + Agentic.Market listing (after legal + Sprint 3).
6. **Phase 1 Goal 2** — MCP server.
7. **Phase 1 Goal 3** — ElizaOS plugin.
8. **Week 4 outreach prep** — depends on Web2-vs-Web3 sequencing decision.
9. **Polish** — mainnet anchor deploy, LogsPage proof link, distributed rate limiting if scaling past one instance.

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

## Next sprint (decided 2026-07-07): x402 per-call payments + Week 3 legal in parallel

**Immediate next task (2026-07-07 evening):** ~~close wallet squat on `POST /v1/auth/key`~~ **done.** Next: x402 Sprint 1 (pricing decision, verification approach, `payment_events` migration) in parallel with Week 3 legal.

Web3-2 is done. **Track A (x402)** is the blocking engineering work for Phase 1 distribution. **Track B (legal)** must close before public Bazaar/Agentic.Market listing. Remaining Web3-2 ops (mainnet anchor deploy, optional LogsPage proof UI) are non-blocking polish.

**Sequencing (2026-07-06): close the two small loose ends first, ToS/Privacy content after.**

**CORS decision, made:** keep `origin: true`. This isn't an oversight — for a public, OpenAI-compatible developer API, the security boundary is the Bearer API key, not same-origin policy. Third-party developers need to call this directly from their own browser-based apps, and you can't whitelist every origin that'll ever want to use LMX Cloud as a backend (same reason OpenAI/Anthropic's own APIs don't restrict CORS on key-authenticated endpoints). The one unauthenticated route, `POST /v1/auth/key`, is already IP-rate-limited (5/hour), which is the right mitigation for that specific route, not CORS. Documenting this closes the loose end — no code change needed.

**Together model parity — CORRECTION (2026-07-06): not actually a live issue.** `apps/api/src/config.ts`'s `optionalProvider("TOGETHER")` only activates the Together tier if `TOGETHER_API_KEY` is set — John confirmed Together isn't configured (costs money, deliberately not hooked up). So Together isn't in the live fallback chain at all right now; its model-map gap is inert, not a real reliability hole. Withdrawing this as a priority fix — flagged it twice without checking activation status first, that was a miss. **Resolved (2026-07-06): Akash is active.** `AKASHML_API_KEY`/`AKASHML_BASE_URL` confirmed set on Railway — real 2-tier fallback (io.net + Akash) in production, not a single point of failure. Together correctly absent, as expected.

**Confirmed (2026-07-06): Railway's `SIWE_CHAIN_ID`/`BASE_RPC_URL` are correctly set to Base mainnet values**, not the Sepolia testnet values used during local testing. Web3-1 is genuinely production-ready — all loose ends from the audit are now closed except Week 3 legal content, which is still outstanding.

## Week 3 — Trust and support basics

- **Terms of Service + Privacy Policy.** Minimal but real — you're collecting emails and usage data from strangers. A generated template (e.g. via a ToS generator or a lawyer-reviewed boilerplate) is enough for a free beta; don't skip it entirely.
- **Acceptable use / abuse policy.** One paragraph: no illegal content, no key sharing/resale, rate limits are enforced, accounts can be revoked. Link it from signup.
- **A feedback channel.** Discord server, a shared email, or a Typeform — something lower-friction than "open a GitHub issue" for non-technical-adjacent testers.
- **Decide (don't build) the future pricing model.** Beta users will ask "what happens when this isn't free." Have a one-line answer ready (e.g. "usage-based, priced near provider cost + margin, beta credits carry over") even though Stripe integration is post-beta.

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
- ~~Nothing on-chain exists anywhere in the codebase~~ — **updated 2026-07-07:** Web3-1 added SIWE + USDC deposit polling; Web3-2 added `LmxLogAnchor` contract, Merkle batch anchoring, and proof API. x402 per-call payments are still not built.

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

Expose an MCP server wrapping the same x402-paid endpoint from Goal 1 (a `search_resources`/call-tool pattern, matching how Bazaar itself is exposed as an MCP server). This is a thin layer on top of Goal 1's payment work, not a second payment system — sequence it immediately after.

**Definition of done:** any MCP-compatible agent can discover LMX Cloud through the MCP registry ecosystem and call it as a paid tool, using the same per-call payment flow as Goal 1.

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
- [ ] Decide per-call pricing (dollar amount per model/token, documented in one place both docs and the eventual Bazaar listing will pull from).
- [ ] Decide payment verification approach: self-verify the on-chain transaction vs. use Coinbase's CDP facilitator — document the trade-off actually made, not just the options.
- [ ] DB migration: add a per-call payment-event record distinct from the existing balance-credit rows, so a payment can be reconciled against the specific inference call it paid for.
- [ ] Confirm the uptime monitor (UptimeRobot/Better Stack) is actually configured — long-open item, now matters more since Bazaar's discovery ranking factors reliability.
- [ ] (Track B, parallel) Kick off ToS / privacy policy / acceptable-use draft — generator template or lawyer-reviewed boilerplate, doesn't need engineering time.
- [x] ~~(Track C) Web3-2 receipt hashing~~ — done (`lmx_receipt_v1`, `usage_events.receipt_hash`).

### Distribution Sprint 2 — x402 per-call payments (Track A)

- [ ] Implement 402 Payment Required response + payment verification on the paid inference routes (`chat.ts` first), per Sprint 1's decision.
- [ ] Reconciliation logic: auto-refund or credit-back when payment succeeds but the downstream io.net/Akash call fails — currently has no path at all, real gap.
- [ ] End-to-end test on Base Sepolia testnet, mirroring the Web3-1 verification pattern.
- [ ] (Track B) Legal draft ready for review.
- [x] ~~(Track C) Web3-2: batched Merkle anchoring live on testnet~~ — done (Sepolia verified 2026-07-07).

### Distribution Sprint 3 — Production hardening

- [ ] Flip x402 config to Base mainnet values; verify in production the same way Web3-1's mainnet config was checked (not just assumed).
- [ ] Abuse/load-test the now-fully-public payment endpoint: replay/double-spend handling on payment proofs, rate limits appropriate for anonymous callers.
- [ ] Portal: extend billing/usage views to show per-call payment records, not just balance draws — decide explicitly whether anonymous (no-session) x402 payments get any payer-visible record at all, or are purely internal-ops visibility.
- [ ] (Track B) Legal published and linked from signup + docs — **hard gate, does not move to Sprint 4 until this is done.**
- [x] ~~(Track C) Web3-2: `GET /v1/usage/logs/:id/proof` endpoint live, contract address + recent roots surfaced on `StatusPage.tsx`~~ — done.
- [ ] (Track C, optional) Deploy anchor contract on Base mainnet + set `ANCHOR_*` on Railway; optional LogsPage proof link.

### Distribution Sprint 4 — Goal 1: x402 Bazaar + Agentic.Market listing

- [ ] Listing metadata, pricing, and schema prepared — same source of truth as the docs page, not maintained twice.
- [ ] Submitted to Bazaar's discovery catalog.
- [ ] Submitted to Agentic.Market directory.
- [ ] Confirm listing is live and actually searchable/found by a test query.
- [ ] **Success metric, watch for:** first real, un-prompted x402 payment from a wallet LMX Cloud has never seen before, routed and settled successfully.

### Distribution Sprint 5 — Goal 2: MCP server

- [ ] Build an MCP server wrapping the same x402-paid endpoint (`search_resources`/call-tool pattern, matching Bazaar's own MCP exposure).
- [ ] Published/discoverable in the MCP registry ecosystem.
- [ ] Tested end-to-end with a real MCP client agent, not just a manual curl test.

### Distribution Sprint 6 — Goal 3: ElizaOS plugin

- [ ] Build the model-provider plugin (wraps the existing OpenAI-compatible endpoint, wires in wallet-based key minting from Web3-1).
- [ ] PR submitted to `elizaos-plugins/registry`.
- [ ] Tested end-to-end with a real ElizaOS agent instance.

## Deliberately deferred (not blocking beta)

- Real payments/Stripe billing — free beta means the dev credit top-up is fine for now.
- Wallet/crypto-native auth beyond the existing `wallet` field.
- SDKs beyond raw HTTP — a docs quickstart is enough until there's demand.
- Multi-region/high-availability infra — a single Railway deployment is fine at beta scale.

## Suggested order if the timeline compresses

If 3-4 weeks becomes 1-2: do the login fix, the real deploy with Postgres, and basic monitoring — then go straight to a small private dry run. Docs, streaming, and model coverage matter for *growth* but won't stop a handful of trusted early users from getting real signal.
