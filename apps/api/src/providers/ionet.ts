import { createOpenAiCompatibleAdapter } from "./openai-compatible.js";

const MODEL_MAP: Record<string, string> = {
  "llama-3-70b": "meta-llama/Llama-3.3-70B-Instruct",
  "llama-3.3-70b": "meta-llama/Llama-3.3-70B-Instruct",
  "meta-llama/Llama-3.3-70B-Instruct": "meta-llama/Llama-3.3-70B-Instruct",
  "llama-3-8b": "meta-llama/Llama-3.1-8B-Instruct",
  "mistral-7b": "mistralai/Mistral-7B-Instruct-v0.3",
};

const ALIASES = [...new Set(Object.keys(MODEL_MAP))];

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
    resolveModel: (model) => MODEL_MAP[model] ?? model,
    aliases: ALIASES,
  });
}
