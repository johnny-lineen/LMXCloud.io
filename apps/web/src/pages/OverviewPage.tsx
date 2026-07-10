import { BarChart3, Boxes, FlaskConical, KeyRound, ScrollText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { fetchKeys, fetchStatus, fetchUsageHistory } from "../api";
import { BarChart } from "../components/BarChart";
import { AlertBanner } from "../components/console/AlertBanner";
import { PageHeader } from "../components/console/PageHeader";
import { QuickLink } from "../components/console/QuickLink";
import { StatCard } from "../components/StatCard";
import { Card } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { useAuth } from "../context/AuthContext";
import { formatNumber, formatUsd } from "../lib/format";
import type { ApiKeyInfo } from "../types";

export function OverviewPage() {
  const { apiKey } = useAuth();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [chartRequests, setChartRequests] = useState<number[]>([]);
  const [providerHealth, setProviderHealth] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    try {
      const [keysRes, historyRes, statusRes] = await Promise.all([
        fetchKeys(apiKey),
        fetchUsageHistory(apiKey, 7),
        fetchStatus().catch(() => null),
      ]);
      setKeys(keysRes.data);
      setChartLabels(historyRes.data.map((bucket) => bucket.date));
      setChartRequests(historyRes.data.map((bucket) => bucket.requests));
      if (statusRes) {
        const healthy = Object.entries(statusRes.providers).filter(([, p]) => p.healthy);
        setProviderHealth(
          healthy.length > 0
            ? `${healthy.length}/${Object.keys(statusRes.providers).length} providers healthy`
            : "Providers degraded",
        );
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalBalance = keys.reduce((sum, key) => sum + key.balance, 0);
  const totalRequests = keys.reduce((sum, key) => sum + key.usage.requests, 0);
  const totalTokens = keys.reduce((sum, key) => sum + key.usage.total_tokens, 0);
  const accountEmail = keys.find((key) => key.email)?.email;
  const hasActivity = totalRequests > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Overview"
        description={
          accountEmail
            ? `Welcome back — ${accountEmail}`
            : "Your LMX Cloud account at a glance."
        }
      />

      {error && <AlertBanner tone="error">{error}</AlertBanner>}

      {providerHealth && (
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="success">{providerHealth}</Chip>
          <Chip tone="info">OpenAI-compatible API</Chip>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total balance"
          value={loading ? "…" : formatUsd(totalBalance)}
          tone="success"
          hint="Across all linked keys"
        />
        <StatCard
          label="API keys"
          value={loading ? "…" : String(keys.length)}
          tone="primary"
          hint="Active keys on this account"
        />
        <StatCard
          label="Total requests"
          value={loading ? "…" : formatNumber(totalRequests)}
          tone="info"
          hint="Lifetime inference calls"
        />
        <StatCard
          label="Total tokens"
          value={loading ? "…" : formatNumber(totalTokens)}
          hint="Prompt + completion"
        />
      </div>

      {!loading && !hasActivity && (
        <Card accent="primary">
          <p className="text-label-sm text-primary">Getting started</p>
          <h3 className="mt-2 text-title-md text-on-surface">Ship your first request in minutes</h3>
          <p className="mt-2 max-w-lg text-body-sm text-on-surface-muted">
            Open the playground to test live, browse models and x402 pricing, or copy MCP config
            from API Keys. Usage and verifiable logs appear automatically after your first call.
          </p>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <QuickLink
          to="/console/playground"
          icon={FlaskConical}
          title="Playground"
          description="Live chat, streaming, and copy-paste snippets."
          accent="primary"
        />
        <QuickLink
          to="/console/models"
          icon={Boxes}
          title="Models & pricing"
          description="Catalog, per-1k rates, and x402 network info."
          accent="info"
        />
        <QuickLink
          to="/console/keys"
          icon={KeyRound}
          title="API Keys"
          description="Create keys, MCP config, and revoke access."
          accent="success"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <QuickLink
          to="/console/usage"
          icon={BarChart3}
          title="Usage"
          description="Daily aggregates, tokens, and spend."
        />
        <QuickLink
          to="/console/logs"
          icon={ScrollText}
          title="Request logs"
          description="Per-call metadata with on-chain proof verification."
        />
      </div>

      <BarChart
        title="Requests (last 7 days)"
        labels={chartLabels}
        values={chartRequests}
        spanDays={7}
        valueLabel={(value) => String(value)}
      />
    </div>
  );
}
