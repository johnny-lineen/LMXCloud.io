import { createOpenAiCompatibleAdapter } from "./openai-compatible.js";
import { aliasKeys, IONET_MODEL_MAP, resolveProviderModel } from "./model-maps.js";

const ALIASES = aliasKeys(IONET_MODEL_MAP);

export interface IonetConfig {
  apiKey: string;
  baseUrl: string;
}

export function createIonetAdapter(config: IonetConfig) {
  return createOpenAiCompatibleAdapter({
    name: "ionet",
    tier: 1,
    costPer1kTokens: 0.0002,
    isDepin: true,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    resolveModel: (model) => resolveProviderModel(IONET_MODEL_MAP, "ionet", model),
    aliases: ALIASES,
  });
}
