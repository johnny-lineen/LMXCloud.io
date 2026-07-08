import { createHash } from "node:crypto";

/** Stable digest for replay protection on payment payloads. */
export function hashPaymentPayload(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}
