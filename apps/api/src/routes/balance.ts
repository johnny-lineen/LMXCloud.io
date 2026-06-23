import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import type { CreditStore } from "../credits/store.js";
import { roundCredits } from "../credits/pricing.js";

interface BalanceRouteDeps {
  creditStore: CreditStore;
  authenticate: preHandlerHookHandler;
}

interface TopUpBody {
  amount?: number;
}

function validateTopUpBody(body: unknown): TopUpBody | string {
  if (body === undefined || body === null) {
    return "Request body must include amount";
  }

  if (typeof body !== "object") {
    return "Request body must be a JSON object";
  }

  const b = body as Record<string, unknown>;
  if (typeof b.amount !== "number" || !Number.isFinite(b.amount) || b.amount <= 0) {
    return "Field 'amount' must be a positive number";
  }

  return { amount: b.amount };
}

export async function registerBalanceRoutes(
  app: FastifyInstance,
  deps: BalanceRouteDeps,
): Promise<void> {
  app.get(
    "/v1/balance",
    { preHandler: deps.authenticate },
    async (request) => {
      const apiKeyId = request.apiKey!.id;
      const balance = await deps.creditStore.getBalance(apiKeyId);

      return {
        object: "balance",
        api_key_id: apiKeyId,
        balance: roundCredits(balance),
        currency: "USD",
      };
    },
  );

  const allowSelfTopUp = process.env.CREDITS_ALLOW_SELF_TOPUP === "true";

  if (allowSelfTopUp) {
    app.post<{ Body: unknown }>(
      "/v1/credits/topup",
      { preHandler: deps.authenticate },
      async (request, reply) => {
        const validated = validateTopUpBody(request.body);

        if (typeof validated === "string") {
          return reply.status(400).send({
            error: { message: validated, type: "invalid_request_error" },
          });
        }

        const balance = await deps.creditStore.credit(
          request.apiKey!.id,
          validated.amount!,
        );

        return reply.status(200).send({
          object: "balance",
          api_key_id: request.apiKey!.id,
          balance: roundCredits(balance),
          currency: "USD",
          credited: roundCredits(validated.amount!),
        });
      },
    );
  }
}
