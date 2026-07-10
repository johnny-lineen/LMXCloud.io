export function chatCompletionCurl(
  apiBase: string,
  apiKey: string,
  model: string,
  message = "Hello from LMX Cloud",
): string {
  return `curl -s ${apiBase}/v1/chat/completions \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${model}",
    "messages": [{"role": "user", "content": "${message}"}],
    "stream": false
  }'`;
}

export function listModelsCurl(apiBase: string, apiKey: string): string {
  return `curl -s ${apiBase}/v1/models \\
  -H "Authorization: Bearer ${apiKey}"`;
}

export function getBalanceCurl(apiBase: string, apiKey: string): string {
  return `curl -s ${apiBase}/v1/balance \\
  -H "Authorization: Bearer ${apiKey}"`;
}

export function getPricingCurl(apiBase: string): string {
  return `curl -s ${apiBase}/v1/pricing`;
}

export function openAiPythonSnippet(apiBase: string, apiKey: string, model: string): string {
  return `from openai import OpenAI

client = OpenAI(
    base_url="${apiBase}/v1",
    api_key="${apiKey}",
)

response = client.chat.completions.create(
    model="${model}",
    messages=[{"role": "user", "content": "Hello from LMX Cloud"}],
)

print(response.choices[0].message.content)`;
}

export function mcpConfig(apiKey: string, mcpUrl: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        lmxcloud: {
          url: mcpUrl,
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        },
      },
    },
    null,
    2,
  );
}

export function verifyReceiptCli(logId: string): string {
  return `pnpm verify:receipt --log-id ${logId}`;
}
