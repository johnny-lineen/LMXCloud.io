#!/usr/bin/env node
/**
 * Agent wallet auth example — sign in with a raw private key (no browser).
 *
 * Usage:
 *   WALLET_PRIVATE_KEY=0x... API_URL=http://localhost:3000 node scripts/wallet-auth.mjs
 */

import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { SiweMessage } from "siwe";

const API_URL = (process.env.API_URL ?? "http://localhost:3000").replace(/\/$/, "");
const privateKey = process.env.WALLET_PRIVATE_KEY;

if (!privateKey) {
  console.error("Set WALLET_PRIVATE_KEY to a hex private key");
  process.exit(1);
}

const account = privateKeyToAccount(privateKey);
const walletClient = createWalletClient({
  account,
  chain: base,
  transport: http(),
});

async function parseError(res) {
  try {
    const body = await res.json();
    return body.error?.message ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

const nonceRes = await fetch(`${API_URL}/v1/auth/wallet/nonce`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ address: account.address }),
});

if (!nonceRes.ok) {
  console.error(await parseError(nonceRes));
  process.exit(1);
}

const noncePayload = await nonceRes.json();
const message = new SiweMessage({
  domain: noncePayload.domain,
  address: account.address,
  statement: "Sign in to LMX Cloud",
  uri: noncePayload.uri,
  version: "1",
  chainId: noncePayload.chain_id,
  nonce: noncePayload.nonce,
}).prepareMessage();

const signature = await walletClient.signMessage({ message });

const verifyRes = await fetch(`${API_URL}/v1/auth/wallet/verify`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message, signature }),
});

if (!verifyRes.ok) {
  console.error(await parseError(verifyRes));
  process.exit(1);
}

const session = await verifyRes.json();
console.log(JSON.stringify(session, null, 2));

const balanceRes = await fetch(`${API_URL}/v1/balance`, {
  headers: { Authorization: `Bearer ${session.session_token}` },
});

if (!balanceRes.ok) {
  console.error(await parseError(balanceRes));
  process.exit(1);
}

const balance = await balanceRes.json();
console.log("Balance:", balance);
