import type { ChatCompletionRequest } from "@lmxcloud/shared";
import { ProviderError, type ProviderAdapter, type ProviderHealthResult } from "./types.js";

export interface OpenAiCompatibleConfig {
  name: string;
  tier: number;
  costPer1kTokens: number;
  isDepin: boolean;
  apiKey: string;
  baseUrl: string;
  resolveModel: (model: string) => string;
  aliases: string[];
  timeoutMs?: number;
}

export function createOpenAiCompatibleAdapter(config: OpenAiCompatibleConfig): ProviderAdapter {
  const timeoutMs = config.timeoutMs ?? 30_000;

  return {
    name: config.name,
    tier: config.tier,
    costPer1kTokens: config.costPer1kTokens,
    isDepin: config.isDepin,
    aliases: config.aliases,

    async healthCheck(): Promise<ProviderHealthResult> {
      const start = performance.now();

      try {
        const response = await fetch(`${config.baseUrl}/models`, {
          headers: { Authorization: `Bearer ${config.apiKey}` },
          signal: AbortSignal.timeout(timeoutMs),
        });

        return {
          healthy: response.ok,
          latencyMs: Math.round(performance.now() - start),
        };
      } catch {
        return {
          healthy: false,
          latencyMs: null,
        };
      }
    },

    async chatCompletion(request: ChatCompletionRequest) {
      const start = performance.now();
      const upstreamModel = config.resolveModel(request.model);

      const body: Record<string, unknown> = {
        model: upstreamModel,
        messages: request.messages,
        stream: request.stream === true,
      };

      if (request.stream === true) {
        body.stream_options = { include_usage: true };
      }

      if (request.temperature !== undefined) {
        body.temperature = request.temperature;
      }

      const maxTokens = request.max_completion_tokens ?? request.max_tokens;
      if (maxTokens !== undefined) {
        body.max_tokens = maxTokens;
        body.max_completion_tokens = maxTokens;
      }

      let response: Response;
      try {
        response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        throw new ProviderError(
          `Failed to reach ${config.name} API`,
          config.name,
          undefined,
          err,
        );
      }

      const latencyMs = Math.round(performance.now() - start);

      if (!response.ok) {
        const errorText = await response.text();
        throw new ProviderError(
          `${config.name} returned ${response.status}: ${errorText}`,
          config.name,
          response.status,
        );
      }

      if (request.stream === true) {
        const parsed = parseProviderStream(response.body, config.name, upstreamModel);
        return {
          response: parsed.response,
          latencyMs,
          usage: parsed.usage,
          stream: parsed.stream,
        };
      }

      const data = (await response.json()) as Awaited<
        ReturnType<ProviderAdapter["chatCompletion"]>
      >["response"];

      return {
        response: data,
        latencyMs,
        usage: data.usage ?? null,
      };
    },
  };
}

function parseProviderStream(
  body: ReadableStream<Uint8Array> | null,
  providerName: string,
  upstreamModel: string,
): {
  response: Awaited<ReturnType<ProviderAdapter["chatCompletion"]>>["response"];
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } | null;
  stream: AsyncIterable<string>;
} {
  if (!body) {
    throw new ProviderError("Provider returned empty stream body", providerName);
  }
  const streamBody = body;

  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  async function* stream(): AsyncIterable<string> {
    for await (const chunk of iterateStreamChunks(streamBody, decoder)) {
      buffer += chunk;

      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const lines = frame
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line.startsWith("data:"));

        for (const line of lines) {
          const data = line.slice(5).trim();
          if (!data) continue;
          if (data === "[DONE]") {
            done = true;
            yield "data: [DONE]\n\n";
            continue;
          }

          const parsed = JSON.parse(data) as {
            [key: string]: unknown;
          };

          yield `data: ${JSON.stringify(parsed)}\n\n`;
        }

        boundary = buffer.indexOf("\n\n");
      }
    }

    if (!done) {
      yield "data: [DONE]\n\n";
    }
  }

  return {
    usage: null,
    stream: stream(),
    response: {
      id: "chatcmpl_streaming_placeholder",
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: upstreamModel,
      choices: [
        {
          index: 0,
          finish_reason: "stop",
          message: {
            role: "assistant",
            content: "",
          },
        },
      ],
    },
  };
}

async function* iterateStreamChunks(
  stream: ReadableStream<Uint8Array>,
  decoder: TextDecoder,
): AsyncIterable<string> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        yield decoder.decode(value, { stream: true });
      }
    }
    const tail = decoder.decode();
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}
