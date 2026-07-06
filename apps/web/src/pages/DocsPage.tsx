import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listUniqueModelAliases } from "@lmxcloud/shared";
import { API_BASE, fetchModels, type ModelsResponse } from "../api";
import { PublicLayout } from "../components/PublicLayout";
import { PageHeader } from "../components/console/PageHeader";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableRow,
  DataTableTh,
} from "../components/console/DataTable";
import { CodeBlock } from "../components/docs/CodeBlock";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { cn } from "../lib/cn";

const SECTIONS = [
  { id: "quickstart", label: "Quickstart" },
  { id: "authentication", label: "Authentication" },
  { id: "chat", label: "Chat completions" },
  { id: "streaming", label: "Streaming" },
  { id: "routing", label: "Routing" },
  { id: "headers", label: "Response headers" },
  { id: "models", label: "Models" },
  { id: "endpoints", label: "Public endpoints" },
] as const;

const EXAMPLE_BASE = API_BASE;

const CATALOG_MODELS = listUniqueModelAliases();

export function DocsPage() {
  const [models, setModels] = useState<ModelsResponse | null>(null);
  const [modelsError, setModelsError] = useState<string | null>(null);

  useEffect(() => {
    void fetchModels()
      .then(setModels)
      .catch((err) =>
        setModelsError(err instanceof Error ? err.message : "Failed to load models"),
      );
  }, []);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,4vw,48px)] py-10 sm:py-14">
        <PageHeader
          eyebrow="Developers"
          title="API documentation"
          description="OpenAI-compatible inference with decentralized routing. Drop in your existing SDK — change the base URL and API key."
          actions={
            <Button to="/sign-up" size="sm">
              Get API key
            </Button>
          }
        />

        <div className="mt-10 grid gap-10 lg:grid-cols-[200px_1fr]">
          <nav className="hidden lg:block">
            <p className="text-label-sm text-on-surface-faint">On this page</p>
            <ul className="mt-3 space-y-1">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="block rounded-md px-3 py-1.5 text-body-sm text-on-surface-muted transition-colors hover:bg-surface hover:text-on-surface"
                  >
                    {section.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="min-w-0 space-y-14">
            <DocSection id="quickstart" title="Quickstart">
              <p className="text-body-md text-on-surface-muted">
                LMX Cloud exposes the same endpoints as OpenAI. Base URL:
              </p>
              <Card className="mt-4 border-primary/30 bg-primary/5">
                <code className="text-mono-sm text-primary">{EXAMPLE_BASE}/v1</code>
              </Card>

              <h3 className="mt-8 text-title-md text-on-surface">1. Create an API key</h3>
              <p className="mt-2 text-body-sm text-on-surface-muted">
                Sign up in the console, or create a throwaway key for testing:
              </p>
              <div className="mt-4">
                <CodeBlock title="curl">
                  {`curl -X POST ${EXAMPLE_BASE}/v1/auth/key \\
  -H "Content-Type: application/json" \\
  -d '{"email":"you@example.com"}'`}
                </CodeBlock>
              </div>

              <h3 className="mt-8 text-title-md text-on-surface">2. Send a chat completion</h3>
              <div className="mt-4 space-y-4">
                <CodeBlock title="curl">
                  {`curl ${EXAMPLE_BASE}/v1/chat/completions \\
  -H "Authorization: Bearer lmx_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "llama-3-70b",
    "messages": [{"role": "user", "content": "Hello from LMX Cloud"}]
  }'`}
                </CodeBlock>

                <CodeBlock title="Python (OpenAI SDK)">
                  {`from openai import OpenAI

client = OpenAI(
    base_url="${EXAMPLE_BASE}/v1",
    api_key="lmx_YOUR_KEY",
)

response = client.chat.completions.create(
    model="llama-3-70b",
    messages=[{"role": "user", "content": "Hello!"}],
)

print(response.choices[0].message.content)`}
                </CodeBlock>

                <CodeBlock title="JavaScript (OpenAI SDK)">
                  {`import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "${EXAMPLE_BASE}/v1",
  apiKey: "lmx_YOUR_KEY",
});

const response = await client.chat.completions.create({
  model: "llama-3-70b",
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(response.choices[0].message.content);`}
                </CodeBlock>
              </div>
            </DocSection>

            <DocSection id="authentication" title="Authentication">
              <p className="text-body-md text-on-surface-muted">
                Inference endpoints require a bearer token. Keys use the format{" "}
                <code className="text-mono-sm text-on-surface">lmx_[32-char-hex]</code>.
              </p>
              <div className="mt-4">
                <CodeBlock title="Authorization header">
                  {`Authorization: Bearer lmx_YOUR_KEY`}
                </CodeBlock>
              </div>
              <p className="mt-4 text-body-sm text-on-surface-muted">
                Account-scoped endpoints (usage, balance, key management) accept your session token
                from the console or any valid API key tied to your account.
              </p>
            </DocSection>

            <DocSection id="chat" title="Chat completions">
              <p className="text-body-md text-on-surface-muted">
                <code className="text-mono-sm">POST /v1/chat/completions</code> accepts
                OpenAI-compatible request bodies. LMX routes to the best available provider and
                returns standard chat completion JSON.
              </p>
              <div className="mt-4">
                <CodeBlock title="Request body">
                  {`{
  "model": "llama-3-70b",
  "messages": [
    {"role": "system", "content": "You are helpful."},
    {"role": "user", "content": "Summarize DePIN inference."}
  ],
  "temperature": 0.7,
  "max_tokens": 1024,
  "stream": false
}`}
                </CodeBlock>
              </div>
              <p className="mt-4 text-body-sm text-on-surface-muted">
                Optional routing preference via{" "}
                <code className="text-mono-sm">x-lmx-prefer</code> header — see Routing below.
              </p>
            </DocSection>

            <DocSection id="streaming" title="Streaming">
              <p className="text-body-md text-on-surface-muted">
                Set <code className="text-mono-sm">"stream": true</code> to receive Server-Sent
                Events (SSE). Token deltas follow the OpenAI streaming format. After the stream
                completes, LMX emits a final metadata event with billing details.
              </p>
              <div className="mt-4 space-y-4">
                <CodeBlock title="curl (streaming)">
                  {`curl -N ${EXAMPLE_BASE}/v1/chat/completions \\
  -H "Authorization: Bearer lmx_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"llama-3-70b","messages":[{"role":"user","content":"Hi"}],"stream":true}'`}
                </CodeBlock>

                <CodeBlock title="Final SSE event (LMX metadata)">
                  {`event: lmx.meta
data: {
  "provider": "ionet",
  "fallback": false,
  "latencyMs": 842,
  "cost": 0.00001234,
  "balance": 0.99998766,
  "usage": {
    "prompt_tokens": 12,
    "completion_tokens": 48,
    "total_tokens": 60
  }
}`}
                </CodeBlock>
              </div>
              <p className="mt-4 text-body-sm text-on-surface-muted">
                Stream responses also include{" "}
                <code className="text-mono-sm">x-lmx-provider</code>,{" "}
                <code className="text-mono-sm">x-lmx-fallback</code>, and{" "}
                <code className="text-mono-sm">x-lmx-latency</code> on the HTTP headers. Cost and
                balance arrive in the <code className="text-mono-sm">lmx.meta</code> event after
                usage is calculated.
              </p>
            </DocSection>

            <DocSection id="routing" title="Routing">
              <p className="text-body-md text-on-surface-muted">
                Control how requests are routed with the{" "}
                <code className="text-mono-sm">x-lmx-prefer</code> request header. When a provider
                fails, LMX automatically tries the next provider in the fallback chain.
              </p>
              <div className="mt-6">
                <DataTable minWidth={520}>
                  <DataTableHead>
                    <tr>
                      <DataTableTh>Header value</DataTableTh>
                      <DataTableTh>Behavior</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    <DataTableRow>
                      <DataTableCell mono>cheapest</DataTableCell>
                      <DataTableCell>Prefer lowest cost-per-token provider</DataTableCell>
                    </DataTableRow>
                    <DataTableRow>
                      <DataTableCell mono>fastest</DataTableCell>
                      <DataTableCell>Prefer lowest recent latency</DataTableCell>
                    </DataTableRow>
                    <DataTableRow>
                      <DataTableCell mono>depin-only</DataTableCell>
                      <DataTableCell>Only decentralized providers; no centralized fallback</DataTableCell>
                    </DataTableRow>
                    <DataTableRow>
                      <DataTableCell mono>provider:ionet</DataTableCell>
                      <DataTableCell>Try named provider first, then fallback chain</DataTableCell>
                    </DataTableRow>
                    <DataTableRow>
                      <DataTableCell mono>(omit)</DataTableCell>
                      <DataTableCell>Default tier order with health-aware prioritization</DataTableCell>
                    </DataTableRow>
                  </DataTableBody>
                </DataTable>
              </div>
              <div className="mt-4">
                <CodeBlock title="Example with routing preference">
                  {`curl ${EXAMPLE_BASE}/v1/chat/completions \\
  -H "Authorization: Bearer lmx_YOUR_KEY" \\
  -H "x-lmx-prefer: cheapest" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"llama-3-70b","messages":[{"role":"user","content":"Hello"}]}'`}
                </CodeBlock>
              </div>
              <p className="mt-4 text-body-sm text-on-surface-muted">
                When a fallback provider serves the request,{" "}
                <code className="text-mono-sm">x-lmx-fallback: true</code> is set — no silent
                centralization.
              </p>
            </DocSection>

            <DocSection id="headers" title="Response headers">
              <p className="text-body-md text-on-surface-muted">
                Every successful chat completion includes LMX routing and billing metadata in
                response headers (non-streaming) or the final SSE event (streaming).
              </p>
              <div className="mt-6">
                <DataTable minWidth={640}>
                  <DataTableHead>
                    <tr>
                      <DataTableTh>Header</DataTableTh>
                      <DataTableTh>Description</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    <DataTableRow>
                      <DataTableCell mono>x-lmx-provider</DataTableCell>
                      <DataTableCell>Provider that served the request (e.g. ionet, akash, together)</DataTableCell>
                    </DataTableRow>
                    <DataTableRow>
                      <DataTableCell mono>x-lmx-fallback</DataTableCell>
                      <DataTableCell>
                        <code className="text-mono-sm">true</code> if a backup provider was used
                      </DataTableCell>
                    </DataTableRow>
                    <DataTableRow>
                      <DataTableCell mono>x-lmx-latency</DataTableCell>
                      <DataTableCell>Upstream provider latency in milliseconds</DataTableCell>
                    </DataTableRow>
                    <DataTableRow>
                      <DataTableCell mono>x-lmx-cost</DataTableCell>
                      <DataTableCell>
                        Credits deducted for this request (USD). Non-streaming only.
                      </DataTableCell>
                    </DataTableRow>
                    <DataTableRow>
                      <DataTableCell mono>x-lmx-balance</DataTableCell>
                      <DataTableCell>
                        Remaining credit balance after deduction. Non-streaming only.
                      </DataTableCell>
                    </DataTableRow>
                  </DataTableBody>
                </DataTable>
              </div>
            </DocSection>

            <DocSection id="models" title="Models">
              <p className="text-body-md text-on-surface-muted">
                <code className="text-mono-sm">GET /v1/models</code> returns aliases available from
                currently healthy providers. No authentication required.
              </p>
              {modelsError && (
                <p className="mt-4 text-body-sm text-error">{modelsError}</p>
              )}
              <div className="mt-6">
                <DataTable title="Available models" minWidth={480}>
                  <DataTableHead>
                    <tr>
                      <DataTableTh>Model ID</DataTableTh>
                      <DataTableTh>Primary provider</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    {!models ? (
                      <DataTableEmpty colSpan={2}>Loading models…</DataTableEmpty>
                    ) : models.data.length === 0 ? (
                      <DataTableEmpty colSpan={2}>
                        No models available — all providers may be unhealthy. Check{" "}
                        <Link to="/status" className="text-primary hover:text-primary-hover">
                          status
                        </Link>
                        .
                      </DataTableEmpty>
                    ) : (
                      models.data.map((model) => (
                        <DataTableRow key={model.id}>
                          <DataTableCell mono>{model.id}</DataTableCell>
                          <DataTableCell>
                            <Chip tone="default">{model.owned_by}</Chip>
                          </DataTableCell>
                        </DataTableRow>
                      ))
                    )}
                  </DataTableBody>
                </DataTable>
              </div>
              <p className="mt-4 text-body-sm text-on-surface-muted">
                Each provider maps aliases to its own upstream model ID. The router only tries
                providers that support the requested alias.
              </p>
              <div className="mt-6">
                <DataTable title="Alias → upstream model" minWidth={800}>
                  <DataTableHead>
                    <tr>
                      <DataTableTh>LMX alias</DataTableTh>
                      <DataTableTh>Upstream ID</DataTableTh>
                      <DataTableTh>io.net</DataTableTh>
                      <DataTableTh>AkashML</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    {CATALOG_MODELS.map((model) => (
                      <DataTableRow key={model.alias}>
                        <DataTableCell mono>{model.alias}</DataTableCell>
                        <DataTableCell mono>{model.upstreamId}</DataTableCell>
                        <DataTableCell>
                          {model.providers.includes("ionet") ? "✓" : "—"}
                        </DataTableCell>
                        <DataTableCell>
                          {model.providers.includes("akash") ? "✓" : "—"}
                        </DataTableCell>
                      </DataTableRow>
                    ))}
                  </DataTableBody>
                </DataTable>
              </div>
              <p className="mt-4 text-body-sm text-on-surface-muted">
                Five models are on both io.net and AkashML; the rest route through io.net when
                configured. See the{" "}
                <Link to="/#models" className="text-primary hover:text-primary-hover">
                  landing page
                </Link>{" "}
                for labels grouped by family.
              </p>
            </DocSection>

            <DocSection id="endpoints" title="Public endpoints">
              <p className="text-body-md text-on-surface-muted">
                These endpoints require no authentication:
              </p>
              <div className="mt-6">
                <DataTable minWidth={520}>
                  <DataTableHead>
                    <tr>
                      <DataTableTh>Endpoint</DataTableTh>
                      <DataTableTh>Description</DataTableTh>
                    </tr>
                  </DataTableHead>
                  <DataTableBody>
                    <DataTableRow>
                      <DataTableCell mono>GET /v1/status</DataTableCell>
                      <DataTableCell>
                        Live provider health and fallback chain — see{" "}
                        <Link to="/status" className="text-primary hover:text-primary-hover">
                          status page
                        </Link>
                      </DataTableCell>
                    </DataTableRow>
                    <DataTableRow>
                      <DataTableCell mono>GET /v1/models</DataTableCell>
                      <DataTableCell>Models from healthy providers</DataTableCell>
                    </DataTableRow>
                    <DataTableRow>
                      <DataTableCell mono>POST /v1/auth/key</DataTableCell>
                      <DataTableCell>Create a new API key (optional email for account linking)</DataTableCell>
                    </DataTableRow>
                  </DataTableBody>
                </DataTable>
              </div>
            </DocSection>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-headline-md text-on-surface">{title}</h2>
      <div className={cn("mt-4")}>{children}</div>
    </section>
  );
}
