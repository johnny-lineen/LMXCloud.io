# x402 Payment Verification

Decision record for Distribution Sprint 1 (2026-07-07).

## Summary

Use the **Coinbase Developer Platform (CDP) x402 Facilitator** for payment verification and on-chain settlement. Self-verify to treasury is documented as a fallback only.

## Options considered

| Approach | Pros | Cons |
|----------|------|------|
| **CDP Facilitator** (chosen) | `/verify` + `/settle` REST API, Base USDC native, KYT screening, Bazaar-compatible, 1k free tx/mo | External dependency, requires `CDP_API_KEY` |
| Self-verify to treasury | Reuses viem + `TREASURY_ADDRESS` from Web3-1 | Must implement EIP-3009/Permit2, settlement keys, replay protection ourselves |
| Hybrid | Facilitator primary + treasury fallback | Two code paths to maintain |

## Decision

**CDP Facilitator** for Sprint 2 launch.

Rationale:

1. Base is already the payment chain (Web3-1 USDC deposits).
2. x402 Bazaar and Agentic.Market listings expect standard facilitator integration.
3. KYT/compliance screening matters once anonymous wallets pay with no signup.
4. Free tier (1,000 settlements/month) is sufficient for beta.
5. viem is already in the stack for deposits/anchoring, but x402 settlement uses EIP-3009 signed authorizations — a different path than ERC-20 `Transfer` events the deposit poller watches.

Self-verify remains a documented escape hatch if CDP limits, cost, or downtime become an issue. Do not build both paths in Sprint 2.

## Target flow (Sprint 2)

```
Client                          LMX API                         CDP Facilitator
  |                                |                                    |
  |-- POST /v1/chat/completions -->|                                    |
  |<-- 402 PAYMENT-REQUIRED -------|                                    |
  |                                |                                    |
  |-- retry + PAYMENT-SIGNATURE -->|                                    |
  |                                |-- POST /verify ------------------>|
  |                                |<-- valid -------------------------|
  |                                |  (record payment_events.verified)  |
  |                                |-- route to io.net/Akash            |
  |                                |-- POST /settle ------------------>|
  |                                |<-- tx_hash ------------------------|
  |                                |  (record payment_events.settled)   |
  |<-- 200 + completion -----------|                                    |
```

## Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `X402_ENABLED` | `false` | Master switch (Sprint 2 enables per-call flow on chat) |
| `X402_FACILITATOR_URL` | `https://api.cdp.coinbase.com/platform/v2/x402` | Facilitator base URL |
| `CDP_API_KEY` | — | CDP API key for facilitator auth |
| `SIWE_CHAIN_ID` | `8453` | Determines `eip155:{chainId}` network in payment requirements |

Sprint 1 ships config parsing and types only. No facilitator calls until Sprint 2.

## Code touchpoints (Sprint 2)

| File | Change |
|------|--------|
| `apps/api/src/payments/verifier.ts` | CDP facilitator client implementing `PaymentVerifier` |
| `apps/api/src/routes/chat.ts` | Dual path: API key → balance; no key → x402 |
| `apps/api/src/payments/store.ts` | Wire `createQuoted` / `markVerified` / `markSettled` into chat flow |

## Replay protection

`payment_events.payment_payload_hash` is a SHA-256 digest of the raw payment payload. Unique index prevents double-spend of the same authorization. Sprint 3 adds anonymous rate limits and additional abuse hardening.

## References

- [Coinbase x402 overview](https://docs.cdp.coinbase.com/x402/welcome)
- [Facilitator concept](https://docs.cdp.coinbase.com/x402/core-concepts/facilitator)
- [x402 protocol repo](https://github.com/coinbase/x402)
