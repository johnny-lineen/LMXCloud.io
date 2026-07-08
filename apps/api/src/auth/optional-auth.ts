import type { FastifyReply, FastifyRequest } from "fastify";
import { extractBearerToken, isValidApiKeyFormat } from "./keys.js";
import {
  isSessionTokenFormat,
  sessionIdentityMatchesRecord,
  verifySessionToken,
} from "./session.js";
import type { ApiKeyRecord, ApiKeyStore } from "./store.js";

interface OptionalAuthOptions {
  sessionSecret: string;
}

/** Sets request.apiKey when a valid Bearer token is present; does not reject missing auth. */
export function createOptionalAuthHook(
  store: ApiKeyStore,
  options: OptionalAuthOptions,
) {
  return async function optionalAuth(
    request: FastifyRequest,
    _reply: FastifyReply,
  ): Promise<void> {
    const token = extractBearerToken(request.headers.authorization);
    if (!token) return;

    if (isSessionTokenFormat(token)) {
      const payload = verifySessionToken(token, options.sessionSecret);
      if (!payload) return;

      const record = await store.findById(payload.id);
      if (!record || !sessionIdentityMatchesRecord(payload, record)) return;

      request.apiKey = record;
      void store.touchLastUsed(record.id);
      return;
    }

    if (!isValidApiKeyFormat(token)) return;

    const record = await store.findByPlainKey(token);
    if (!record) return;

    request.apiKey = record;
    void store.touchLastUsed(record.id);
  };
}

export function hasBearerAuth(request: FastifyRequest): boolean {
  return extractBearerToken(request.headers.authorization) !== null;
}

export function requireAuthenticatedKey(
  request: FastifyRequest,
  reply: FastifyReply,
): request is FastifyRequest & { apiKey: ApiKeyRecord } {
  if (request.apiKey) return true;

  if (hasBearerAuth(request)) {
    void reply.status(401).send({
      error: {
        message: "Invalid or expired credentials",
        type: "authentication_error",
      },
    });
    return false;
  }

  return false;
}
