import { createOpenAiCompatibleAdapter } from "./openai-compatible.js";
import { aliasKeys, AKASH_MODEL_MAP, resolveProviderModel } from "./model-maps.js";

const ALIASES = aliasKeys(AKASH_MODEL_MAP);

export interface AkashConfig {
  apiKey: string;
  baseUrl: string;
}

export function createAkashAdapter(config: AkashConfig) {
  return createOpenAiCompatibleAdapter({
    name: "akash",
    tier: 2,
    costPer1kTokens: 0.0001,
    isDepin: true,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    resolveModel: (model) => resolveProviderModel(AKASH_MODEL_MAP, "akash", model),
    aliases: ALIASES,
  });
}
