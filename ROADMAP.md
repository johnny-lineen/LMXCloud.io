# LMX Cloud — Path to Public Beta

Goal: go from working proof-of-concept (Phase 1-7) to something you can hand to strangers — developers trying it for free — without it breaking, leaking data, or embarrassing you. Target: 3-4 weeks. Payments are out of scope for this phase (free beta); pricing/billing becomes Phase 9+ once there's real usage signal.

## Where things actually stand (verified against code, 2026-07-06)

Weeks 1 and 2 are functionally done. Verified in the actual source, not just assumed:

- `POST /v1/auth/login` is gone from `apps/api/src/routes/auth.ts` — no trace of it left. The account-takeover gap is closed for real now.
- `SESSION_SECRET` uses `requireEnv("SESSION_SECRET")` in `config.ts` — no more insecure default, app won't boot without it.
- Rate limits tightened: key generation defaults to 5/hour, chat to 30/min, both documented inline as conservative free-beta starting points.
- Sentry dependency present in `apps/api/package.json`.
- Streaming is implemented in `apps/api/src/routes/chat.ts` — real SSE handling, including mid-stream credit deduction and error handling.
- `apps/web/src/pages/LogsPage.tsx`, `StatusPage.tsx`, and `DocsPage.tsx` all exist.

**Still open:**
- CORS is still `origin: true` — never got an explicit decision, just left as-is. Low urgency (Bearer-token auth, not cookie-based), but still undocumented as an intentional choice.
- Model coverage: `together.ts` still only aliases the 70b model while `ionet.ts`/`akash.ts` alias more — worth confirming this got finished, and that `llama-3-8b`/`mistral-7b` were actually tested end-to-end, not just aliased.
- Uptime monitor (UptimeRobot/Better Stack) — external, manual step, not verifiable from code. Confirm it's actually set up.
- Week 3 (ToS, privacy, acceptable use, feedback channel, pricing one-liner) — not started.
- Week 4 (outreach prep) — not started, and now intersects with the Web3-positioning question below.

## Week 1 — Deploy for real, close the security gap (DONE)

- ~~Delete `POST /v1/auth/login`~~ — done, verified in code.
- ~~Rotate `SESSION_SECRET`~~ — done, now required at boot.
- ~~Deploy API to Railway, dashboard + demo to Vercel~~ — done.
- ~~Add error monitoring + uptime check~~ — Sentry dependency present; confirm uptime monitor is actually configured (external, can't verify from code).
- ~~Re-check rate limits~~ — done, tightened defaults in place.
- **CORS is currently `origin: true`** — still not an explicit, documented decision. Low priority given Bearer-token auth, but close it out.

## Week 2 — Make it usable by someone who isn't you (DONE)

- ~~API docs page~~ — `DocsPage.tsx` exists.
- ~~Streaming support~~ — implemented in `chat.ts`.
- **Expand model coverage** — partially done; confirm `together.ts` parity and that all aliased models actually work end-to-end.
- **Polish the signup → key → first request flow** — not explicitly verified; walk through it as a stranger would.
- ~~Public status page~~ — `StatusPage.tsx` exists.
- ~~Per-request logs~~ — `LogsPage.tsx` exists.

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

- `wallet` is already a first-class field on `ApiKeyRecord`/`CreateApiKeyInput` in `apps/api/src/auth/store.ts`, and `listForRecord` already groups keys by wallet exactly like it does by email. But it's never verified — any caller can claim any wallet string today with zero signature check. Same class of gap as the old email-login issue.
- `CreditStore.credit(apiKeyId, amount)` in `apps/api/src/credits/postgres-store.ts` is already the exact function a stablecoin deposit listener would call — no schema change needed, just a new caller instead of the manual `CREDITS_ALLOW_SELF_TOPUP` dev route in `routes/balance.ts`.
- An API key can already be minted with just a `wallet` string and no email (`POST /v1/auth/key`) — meaning agent self-sovereign key minting is nearly free once wallet claims are actually verified.
- Nothing on-chain exists anywhere in the codebase — no signature verification, no contracts, no anchoring. Pillars 1 and 3 below are real builds, not wiring.

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

Read the actual `WalletConnectButton.tsx`, `AuthContext.tsx`, and `BillingPage.tsx` Cursor produced to find real gaps, not guessed ones:

- **No live refresh.** `BillingPage` only loads deposit/balance state once on mount — a user watching a deposit confirm has to manually reload the page repeatedly to see "Confirming (3/10)" progress or the eventual credit. Defeats the point of an automatic-crediting feature if it still requires manual polling by the user.
- **No wrong-network handling.** `WalletConnectButton` never checks or prompts a network switch — if the connected wallet isn't on the app's configured chain, there's no graceful recovery. This is the exact confusion that had to be debugged by hand during testing.
- **Connecting vs. signing aren't distinguished.** The button shows "Connecting…" through both the wallet-connection approval and the separate signature approval — two different MetaMask popups with one label, which reads as stuck or unclear.
- **No handling for wallet-side account/network switches after sign-in.** If a user changes the active account or network in their wallet extension while already signed into an LMX session, nothing detects it or re-prompts — session and wallet state can silently drift apart.
- **"Unmatched" deposits have no user-facing resolution path.** The deposit table already shows an "Unmatched" status (a transfer from an unverified address), but there's no guidance on what a user should do about it.
- **Mobile/non-extension wallets aren't supported** — only injected (browser extension) connectors work. Flagged as a future option (WalletConnect/Reown), not required for this pass.

### In-console "Add Credits" (decided 2026-07-06)

Replace the manual "copy treasury address, go do it yourself in MetaMask" flow on `BillingPage.tsx` with a one-click in-console flow: click "Add Credits," pick or enter an amount, wallet auto-connects if needed, one approval sends USDC directly to the treasury address. **Wallet-authenticated accounts only** — Clerk/email accounts don't get this (keeps the "accounts stay separate" decision intact, no identity-linking work needed).

The only step that can't be automated is the user approving the actual transfer — their funds, their signature. Everything else can be seamless, and it's a single approval (a plain ERC-20 `transfer` to the treasury), not the two-step approve-then-pull pattern.

### Sprint Web3-2 — Verifiable on-chain logs

- Sign or hash each `usage_events` row (already recording provider/model/latency/cost per call) into a per-request receipt.
- Periodically anchor a Merkle root of recent receipts on-chain so routing is provably real, not just claimed — extends `LogsPage.tsx`/`StatusPage.tsx` rather than replacing them.

### Sprint Web3-3 — Agents as economic actors

- Formalize the "key = economic identity" pattern that already exists, aligned to an emerging machine-payment standard (HTTP 402 / x402-style) rather than a bespoke protocol, so third-party agent frameworks can pay LMX Cloud programmatically without custom integration work per agent platform.

**Native token — deferred by design**, after Web3-1 through 3, once there's real usage/treasury data. Flagged once: "governance + economic rights" token language is securities-law surface area (Howey-test territory) — legal counsel before any public token language, not an engineering task.

**Open question, still unresolved:** does this replace the current dev-first free-beta plan (Weeks 3-4 above), or run as a parallel track? Web2 (Clerk) and Web3 (wallet) users can coexist under Web3-1's design, but Week 4 outreach copy/channel choice should reflect whichever way this leans.

## Deliberately deferred (not blocking beta)

- Real payments/Stripe billing — free beta means the dev credit top-up is fine for now.
- Wallet/crypto-native auth beyond the existing `wallet` field.
- SDKs beyond raw HTTP — a docs quickstart is enough until there's demand.
- Multi-region/high-availability infra — a single Railway deployment is fine at beta scale.

## Suggested order if the timeline compresses

If 3-4 weeks becomes 1-2: do the login fix, the real deploy with Postgres, and basic monitoring — then go straight to a small private dry run. Docs, streaming, and model coverage matter for *growth* but won't stop a handful of trusted early users from getting real signal.
