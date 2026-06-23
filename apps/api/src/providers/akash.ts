import { createOpenAiCompatibleAdapter } from "./openai-compatible.js";

const MODEL_MAP: Record<string, string> = {
  "llama-3-70b": "meta-llama/Llama-3.3-70B-Instruct",
  "llama-3.3-70b": "meta-llama/Llama-3.3-70B-Instruct",
  "meta-llama/Llama-3.3-70B-Instruct": "meta-llama/Llama-3.3-70B-Instruct",
  "llama-3-8b": "meta-llama/Llama-3.1-8B-Instruct",
  "mistral-7b": "mistralai/Mistral-7B-Instruct-v0.3",
};

const ALIASES = [...new Set(Object.keys(MODEL_MAP))];

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
    resolveModel: (model) => MODEL_MAP[model] ?? model,
    aliases: ALIASES,
  });
}
