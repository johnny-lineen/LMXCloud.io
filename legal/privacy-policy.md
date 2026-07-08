# Privacy Policy

**Effective date:** July 8, 2026  
**Service:** LMX Cloud (`lmxcloud.io`)

This Privacy Policy explains how LMX Cloud ("we," "us," or "our") collects, uses, and shares information when you use our websites, API, and dashboard (the "Service").

## 1. Information we collect

### Account and identity

- **Email address** — if you sign up with email (via Clerk).
- **Wallet address** — if you sign in with Ethereum (SIWE) or pay via x402 or USDC deposits.
- **API key identifiers** — we store key metadata and hashed or masked secrets; treat API keys as passwords.

### Usage and operations

- **Inference metadata** — model name, provider routed, token counts, latency, cost, timestamps, fallback flags, and similar operational fields.
- **Verifiable receipts** — we hash routing metadata into `lmx_receipt_v1` receipts for anchoring. **We do not include prompt or completion text in on-chain receipts.**
- **Request logs** — may include metadata visible in your dashboard; content retention policies may evolve; do not submit secrets in prompts.
- **IP address, user agent, and rate-limit counters** — for security and abuse prevention.

### Payments

- **On-chain transaction hashes, payer wallet addresses, and payment amounts** — for USDC deposits and x402 per-call payments.
- **Payment event records** — quoted and settled amounts linked to usage where applicable.

### Cookies and local storage

- Session tokens and dashboard preferences in browser storage.
- Clerk authentication cookies when you use email sign-in.

## 2. How we use information

We use information to:

- Provide, secure, and improve the Service
- Authenticate users and API keys
- Meter usage, bill accounts, and reconcile payments
- Detect abuse, fraud, and violations of our Acceptable Use Policy
- Comply with legal obligations
- Communicate service updates and respond to support requests

## 3. What we do not sell

We do not sell your personal information. We do not use your prompts to train third-party foundation models unless we explicitly tell you otherwise in a separate agreement.

## 4. Sharing with service providers

We use third-party providers that process data on our behalf, including:

- **Clerk** — email authentication
- **Hosting and database providers** (e.g., Railway, Vercel, Neon) — infrastructure
- **Inference providers** (e.g., io.net, Akash) — your API requests are sent to route inference
- **Coinbase Developer Platform** — x402 payment verification and settlement when enabled
- **Blockchain networks** — receipt roots and payment transactions are public on-chain

Each provider is used under their own terms and privacy policies.

## 5. Public blockchain data

Wallet addresses, transaction hashes, and anchored Merkle roots are **public** on Base (or configured networks). Anyone can view them on a block explorer. Do not use the Service if you are unwilling to have payment and anchoring metadata appear on-chain.

## 6. Retention

We retain account and usage data while your account is active and as needed for billing, security, legal compliance, and dispute resolution. We may retain anonymized or aggregated statistics longer.

## 7. Security

We use industry-standard measures including TLS, access controls, and hashed credentials where applicable. No system is perfectly secure; you are responsible for protecting API keys and wallet keys.

## 8. Your choices and rights

Depending on your location, you may have rights to access, correct, delete, or export personal data, or to object to certain processing. Contact **support@lmxcloud.io** with subject `Privacy request`. We may need to verify your identity (e.g., via account email or wallet signature).

You may revoke API keys in the dashboard and disconnect wallets at any time.

## 9. Children

The Service is not directed to children under 18. We do not knowingly collect data from children.

## 10. International users

If you access the Service from outside the United States, you consent to processing in the United States and other countries where our providers operate.

## 11. Changes

We may update this Policy. We will post the revised version with a new effective date. Material changes may be communicated via the website or email where appropriate.

## 12. Contact

Privacy questions: **support@lmxcloud.io**
