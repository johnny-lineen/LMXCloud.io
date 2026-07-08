import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPaymentPayload } from "./idempotency.js";

describe("hashPaymentPayload", () => {
  it("returns a stable 64-character hex digest", () => {
    const hash = hashPaymentPayload('{"nonce":"abc"}');
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.equal(hash, hashPaymentPayload('{"nonce":"abc"}'));
  });

  it("changes when the payload changes", () => {
    assert.notEqual(
      hashPaymentPayload('{"nonce":"abc"}'),
      hashPaymentPayload('{"nonce":"def"}'),
    );
  });
});
