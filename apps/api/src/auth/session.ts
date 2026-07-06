import crypto from "crypto";

const PREFIX = "lmx_sess_";

export type SessionIdentity =
  | { email: string; wallet?: never }
  | { wallet: string; email?: never };

export interface SessionPayload {
  id: string;
  email?: string;
  wallet?: string;
  exp: number;
}

export function isSessionTokenFormat(token: string): boolean {
  return token.startsWith(PREFIX);
}

function signPayload(payload: SessionPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${PREFIX}${body}.${sig}`;
}

export function createSessionToken(
  apiKeyId: string,
  email: string,
  secret: string,
  ttlMs: number,
): string {
  return createSessionTokenForIdentity(
    apiKeyId,
    { email: email.trim().toLowerCase() },
    secret,
    ttlMs,
  );
}

export function createSessionTokenForIdentity(
  apiKeyId: string,
  identity: SessionIdentity,
  secret: string,
  ttlMs: number,
): string {
  const payload: SessionPayload = {
    id: apiKeyId,
    exp: Date.now() + ttlMs,
    ...(identity.email !== undefined
      ? { email: identity.email.trim().toLowerCase() }
      : { wallet: identity.wallet.trim().toLowerCase() }),
  };
  return signPayload(payload, secret);
}

export function verifySessionToken(
  token: string,
  secret: string,
): SessionPayload | null {
  if (!token.startsWith(PREFIX)) return null;

  const rest = token.slice(PREFIX.length);
  const dot = rest.lastIndexOf(".");
  if (dot === -1) return null;

  const body = rest.slice(0, dot);
  const sig = rest.slice(dot + 1);
  const expected = crypto.createHmac("sha256", secret).update(body).digest("base64url");

  if (sig.length !== expected.length || !crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expected),
  )) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf-8"),
    ) as SessionPayload;

    const hasEmail = Boolean(payload.email?.trim());
    const hasWallet = Boolean(payload.wallet?.trim());
    if (!payload.id || payload.exp < Date.now() || hasEmail === hasWallet) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function sessionIdentityMatchesRecord(
  payload: SessionPayload,
  record: { email?: string; wallet?: string },
): boolean {
  if (payload.email) {
    return record.email?.trim().toLowerCase() === payload.email.trim().toLowerCase();
  }
  if (payload.wallet) {
    return record.wallet?.trim().toLowerCase() === payload.wallet.trim().toLowerCase();
  }
  return false;
}
