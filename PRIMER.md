# LMX Cloud — Primer

*A standalone overview for anyone getting oriented. For the live, code-verified execution plan, see `ROADMAP.md` — this document explains the "what and why," the roadmap tracks the "when."*

## What we're building

LMX Cloud started as a DePIN inference router — an OpenAI-compatible API that routes AI inference requests across decentralized GPU networks (io.net, Akash) instead of a single centralized provider, with automatic failover if one network is degraded or down.

The direction has since sharpened. LMX Cloud is repositioning as Web3-native infrastructure specifically built for autonomous AI agents — software that holds its own crypto wallet and pays for its own compute with no human in the loop. The pitch: **x402-native agent payments, paired with routing to decentralized compute supply that a hyperscaler has no margin incentive to ever offer.**

## The business thesis — why this, and not something more obvious

The natural-seeming path — sell cheap GPU access to broad AI developers — is already a red ocean. CoreWeave alone reached a $23B IPO valuation, $5B revenue in 2025, and a $99.4B order backlog by March 2026, and it competes purely on price and capacity, not decentralization. Over 300 new GPU cloud entrants launched in 2025; H100 rental prices fell 64-75% in eighteen months. That lane is capital-intensive and already owned by well-funded, centralized players.

The other natural-seeming path — sell decentralized compute to "web3 developers" broadly — is smaller and more stagnant than it looks. Akash, the closest comparable, has a customer list of a handful of crypto-native projects selling to each other, and its active provider count recently hit the lowest point in the network's history.

The actual wedge sits between those two failures: **autonomous agents and DAOs that structurally cannot use hyperscaler billing.** A DAO's treasury is a multisig wallet, not a corporate entity with a credit card — it cannot open an AWS enterprise account. An autonomous agent can't sign an enterprise services agreement. Both can hold and spend a crypto wallet, because sending crypto is just software signing a message. x402 (the emerging HTTP-402-based machine payment standard, backed by Coinbase, Cloudflare, Stripe, Google, Microsoft, AWS, Circle, Visa, and Mastercard) is becoming the way software pays software. Pairing that payment rail with routing into decentralized compute supply is something a centralized neocloud has no reason to ever build — they'd be giving up margin and control to resell someone else's capacity.

## Who the customer actually is

Ranked by how acutely they feel the problem: DAOs and crypto-native treasuries with no path into enterprise cloud billing (Gnosis, Mantle, and Tron DAO are all already funding "AI agents as economic actors" off billion-dollar-plus treasuries); agent-launchpad ecosystems (Virtuals Protocol hosts 15,800+ agent projects, ElizaOS is the de facto framework for on-chain agents) where operators want each agent self-sovereign rather than manually funded; and existing crypto-native AI teams who already hold stablecoin treasuries and want multi-provider resilience without operating the routing logic themselves.

## How we make money

Not like CoreWeave, which owns hardware and carries capital expenditure. LMX Cloud doesn't own any compute — it buys wholesale from io.net and Akash and charges a spread on top, per request. That's closer to Stripe/Plaid economics than to a cloud provider's: thin margin per unit, no capex, and margin that holds or improves as the underlying DePIN market keeps getting cheaper. Revenue scales by routing more traffic through the toll booth, not by building more capacity.

## Distribution — how an agent actually finds us

Three channels, chosen deliberately, in this order:

1. **x402 Bazaar + Agentic.Market** — Coinbase's protocol-level discovery layer for x402-paid services. Any agent using x402 can find LMX Cloud here regardless of what framework built it. Widest reach for the least integration effort.
2. **An MCP server** — exposes LMX Cloud as callable tools to any MCP-compatible agent (Claude, ChatGPT agents, custom LangChain agents). Shipped v1 (2026-07-09): hosted at `mcp.lmxcloud.io`, seven tools covering status, pricing, balance, usage, and inference. Remaining: x402 per-call payments and registry listing.
3. **An ElizaOS plugin** — listed in the ElizaOS plugin registry, wrapping our existing OpenAI-compatible endpoint with wallet-native key minting. Framework-specific and higher-touch, deliberately sequenced last as a reference case study once the payment plumbing is proven.

Virtuals Protocol (its Agent Commerce Protocol) is explicitly out of scope for now — a bespoke on-chain escrow/job system, not confirmed to run over x402, meaningfully heavier to build against. Revisit only once the first three channels show real traffic. Autonolas, Fetch.ai, and Bittensor are longer-tail and not pursued yet either.

## What's built so far

The core inference router is live: multi-provider routing across io.net and Akash with health-aware fallback, real streaming completions, and 30 model aliases. Security and ops hardening is done — the original account-takeover login vulnerability is closed, session secrets are enforced, rate limits are tightened, and Sentry error monitoring is fully wired. A full developer dashboard exists — overview, key management, usage, per-request logs, a public status page, billing, and docs. Most importantly, **Web3-1 is shipped and verified end-to-end**: wallet-based sign-in (SIWE) as a first-class alternative to email, agent-mintable API keys via a raw keypair with no browser required (the piece that makes agent distribution possible at all), and USDC deposits on Base that auto-credit a usable balance. Documentation has been refreshed to describe this Web3 direction rather than presenting LMX Cloud as a plain DePIN dev tool.

## What's left to build

Legal and policy content — Terms of Service, privacy policy, acceptable use — doesn't exist anywhere in the repo yet, and is now a hard blocker: going live on public agent-discovery catalogs means strangers' autonomous agents transacting real stablecoin with zero prior relationship, a bigger exposure than the original free-beta plan was ever scoped for.

On the engineering side, the current payment model only supports depositing funds and drawing down a balance over many requests — it doesn't yet support paying per individual call, which is what x402 and the discovery catalogs expect. Building that per-call payment layer, including a real reconciliation path for the case where payment succeeds but the underlying compute call fails (a gap that doesn't exist today), is the single biggest remaining piece of engineering. Verifiable on-chain logs — cryptographic proof that routing, latency, and cost claims haven't been altered after the fact — are scoped but not yet built, and matter for trust once anonymous agents are the buyer. Once per-call payments work, the three distribution goals above are still to be built and submitted.

The full week-by-week execution plan for closing these gaps — legal, payment plumbing, verifiable logs, then the three distribution goals in sequence — lives in `ROADMAP.md` under "Phase 1 sprint plan."

## Key risks worth watching

Real agent-to-agent payment volume is still thin and lumpy industry-wide — a meaningful share of early x402 activity has come from one viral memecoin experiment rather than organic, diverse demand. The payment rail itself isn't a durable moat: x402 is an open standard, and nothing stops io.net or Akash from adding direct support and disintermediating an aggregator layer. And the "resilience through decentralization" pitch depends on the underlying DePIN supply staying healthy — Akash's active provider count is at its lowest point on record, which cuts against that story if it continues. None of these are reasons not to pursue this — they're the specific things that would tell us early if the bet isn't working.
