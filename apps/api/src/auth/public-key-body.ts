export interface PublicCreateKeyBody {
  email?: string;
}

export type PublicCreateKeyBodyResult = PublicCreateKeyBody | string;

export const WALLET_VERIFICATION_REQUIRED = "wallet_verification_required" as const;

/** Validates body for unauthenticated POST /v1/auth/key — wallet claims are rejected. */
export function validatePublicCreateKeyBody(body: unknown): PublicCreateKeyBodyResult {
  if (body === undefined || body === null) {
    return {};
  }

  if (typeof body !== "object") {
    return "Request body must be a JSON object";
  }

  const b = body as Record<string, unknown>;

  if (b.wallet !== undefined) {
    return WALLET_VERIFICATION_REQUIRED;
  }

  const result: PublicCreateKeyBody = {};

  if (b.email !== undefined) {
    if (typeof b.email !== "string" || b.email.trim() === "") {
      return "Field 'email' must be a non-empty string";
    }
    result.email = b.email.trim();
  }

  return result;
}
