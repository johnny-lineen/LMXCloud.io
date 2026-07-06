import Fastify from "fastify";
import cors from "@fastify/cors";
import * as Sentry from "@sentry/node";
import { getAddress } from "viem";
import { createApiKeyStore, createAuthHook } from "./auth/index.js";
import { createWalletNonceStore } from "./auth/wallet-nonce.js";
import { loadConfig } from "./config.js";
import { closePool } from "./db/pool.js";
import { DepositPoller } from "./deposits/poller.js";
import { MIN_DEPOSIT_USDC } from "./deposits/limits.js";
import { createDepositStore } from "./deposits/store.js";
import { HealthMonitor } from "./health/monitor.js";
import { InMemoryHealthStore } from "./health/store.js";
import { createProviderRegistry, getFallbackChain } from "./providers/registry.js";
import { InferenceRouter } from "./routing/router.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerChatRoutes } from "./routes/chat.js";
import { registerModelsRoutes } from "./routes/models.js";
import { registerStatusRoutes } from "./routes/status.js";
import { registerUsageRoutes } from "./routes/usage.js";
import { registerBalanceRoutes } from "./routes/balance.js";
import { createRateLimiter } from "./rate-limit.js";
import { createUsageStore } from "./usage/index.js";
import { createCreditStore } from "./credits/index.js";



export async function buildServer() {

  const config = loadConfig();

  const app = Fastify({

    trustProxy: true,

    logger: {

      level: process.env.LOG_LEVEL ?? "info",

    },

  });

  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  } else {
    app.log.warn("SENTRY_DSN is not set — errors will not be reported to Sentry");
  }

  if (!config.clerkSecretKey) {
    app.log.warn("CLERK_SECRET_KEY is not set — POST /v1/auth/clerk will return 503");
  }



  await app.register(cors, {

    origin: true,

    exposedHeaders: [
      "x-lmx-provider",
      "x-lmx-fallback",
      "x-lmx-latency",
      "x-lmx-cost",
      "x-lmx-balance",
    ],

  });

  app.setErrorHandler((error, request, reply) => {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
    }
    request.log.error({ err: error }, "Unhandled error");
    if (!reply.sent) {
      void reply.status(500).send({
        error: {
          message: "Internal server error",
          type: "internal_error",
        },
      });
    }
  });



  const providers = createProviderRegistry(config);

  const healthStore = new InMemoryHealthStore();

  const healthMonitor = new HealthMonitor(

    providers,

    healthStore,

    config.healthPollIntervalMs,

  );

  const router = new InferenceRouter(providers, healthStore);

  const apiKeyStore = await createApiKeyStore();

  const usageStore = createUsageStore();

  const creditStore = createCreditStore();

  const walletNonceStore = createWalletNonceStore();

  const authenticate = createAuthHook(apiKeyStore, {
    sessionSecret: config.sessionSecret,
  });

  let depositPoller: DepositPoller | null = null;
  const depositStore = createDepositStore();
  if (config.deposits && depositStore) {
    depositPoller = new DepositPoller(
      {
        rpcUrl: config.deposits.rpcUrl,
        treasuryAddress: getAddress(config.deposits.treasuryAddress),
        usdcContractAddress: getAddress(config.deposits.usdcContractAddress),
        chainId: config.deposits.chainId,
        confirmations: config.deposits.confirmations,
        pollIntervalMs: config.deposits.pollIntervalMs,
        lookbackBlocks: config.deposits.lookbackBlocks,
        maxDepositUsdc: config.deposits.maxDepositUsdc,
      },
      depositStore,
      apiKeyStore,
      (message) => app.log.info(message),
    );
    depositPoller.start();
  } else if (process.env.TREASURY_ADDRESS || process.env.BASE_RPC_URL) {
    app.log.warn(
      "Deposit poller disabled — requires DATABASE_URL, BASE_RPC_URL, and TREASURY_ADDRESS",
    );
  }



  healthMonitor.start();

  app.addHook("onClose", async () => {

    healthMonitor.stop();

    depositPoller?.stop();

    await closePool();

  });



  app.get("/health", async () => ({

    status: "ok",

    providers: providers.map((provider) => provider.name),

    fallback_chain: getFallbackChain(providers),

    storage: process.env.DATABASE_URL ? "postgres" : "file",

  }));



  await registerAuthRoutes(app, {
    store: apiKeyStore,
    authenticate,
    keyGenRateLimit: createRateLimiter({
      max: config.keyGenRateLimitMax,
      windowMs: config.keyGenRateLimitWindowMs,
    }),
    creditStore,
    usageStore,
    initialCreditBalance: config.initialCreditBalance,
    sessionSecret: config.sessionSecret,
    sessionTtlMs: config.sessionTtlMs,
    clerkSecretKey: config.clerkSecretKey,
    walletNonceStore,
    siwe: config.siwe,
  });

  await registerStatusRoutes(app, { providers, healthStore });
  await registerModelsRoutes(app, { providers, healthStore });

  await registerChatRoutes(app, {
    router,
    authenticate,
    usageStore,
    creditStore,
    chatRateLimit: createRateLimiter({
      max: config.chatRateLimitMax,
      windowMs: config.chatRateLimitWindowMs,
    }),
    minChatCost: config.minChatCost,
  });
  await registerUsageRoutes(app, { store: usageStore, apiKeyStore, authenticate });
  await registerBalanceRoutes(app, {
    creditStore,
    authenticate,
    depositStore,
    depositInfo: config.deposits
      ? {
          treasuryAddress: getAddress(config.deposits.treasuryAddress),
          usdcContractAddress: getAddress(config.deposits.usdcContractAddress),
          chain: config.deposits.chainLabel,
          chainId: config.deposits.chainId,
          token: "USDC",
          confirmations: config.deposits.confirmations,
          minDepositUsdc: MIN_DEPOSIT_USDC,
          maxDepositUsdc: config.deposits.maxDepositUsdc,
        }
      : undefined,
  });



  return { app, config };

}

