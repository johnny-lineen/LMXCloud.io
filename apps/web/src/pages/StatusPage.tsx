import { Activity, ArrowRight, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE, fetchStatus, type StatusResponse } from "../api";
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
import { AlertBanner } from "../components/console/AlertBanner";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { formatDateTime, formatLatency } from "../lib/format";

const POLL_MS = 30_000;

function formatLastCheck(timestamp: number | null): string {
  if (timestamp === null) return "—";
  return formatDateTime(new Date(timestamp).toISOString());
}

export function StatusPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const data = await fetchStatus();
      setStatus(data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const providers = status
    ? Object.entries(status.providers).sort(([, a], [, b]) => a.tier - b.tier)
    : [];
  const healthyCount = providers.filter(([, p]) => p.healthy).length;
  const allHealthy = providers.length > 0 && healthyCount === providers.length;
  const noneHealthy = providers.length > 0 && healthyCount === 0;

  return (
    <PublicLayout>
      <div className="mx-auto max-w-[1200px] px-[clamp(20px,4vw,48px)] py-10 sm:py-14">
        <PageHeader
          eyebrow="Infrastructure"
          title="Provider status"
          description="Live health for inference providers. Polled every 30 seconds — same signal the router uses for failover."
          actions={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={refreshing}
              onClick={() => void load(true)}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />

        {error && (
          <AlertBanner tone="error" className="mt-6">
            {error}
            <span className="block mt-1 text-body-sm opacity-80">
              API: {API_BASE}/v1/status
            </span>
          </AlertBanner>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Overall"
            value={
              loading
                ? "…"
                : allHealthy
                  ? "Operational"
                  : noneHealthy
                    ? "Degraded"
                    : "Partial"
            }
            tone={allHealthy ? "success" : noneHealthy ? "error" : "warning"}
            hint={
              loading
                ? "Checking providers…"
                : `${healthyCount} of ${providers.length} providers healthy`
            }
          />
          <StatCard
            label="Healthy providers"
            value={loading ? "—" : String(healthyCount)}
            tone="primary"
            hint="Used for routing when strategy allows"
          />
          <StatCard
            label="Last updated"
            value={lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
            tone="info"
            hint={lastUpdated ? "Auto-refreshes every 30s" : "Waiting for first poll"}
          />
        </div>

        {status?.fallback_chain && status.fallback_chain.length > 0 && (
          <Card className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Activity className="h-4 w-4 text-primary" strokeWidth={1.75} />
              <p className="text-body-sm font-medium text-on-surface">Fallback chain</p>
              <span className="text-body-sm text-on-surface-faint">· tier order</span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {status.fallback_chain.map((name, index) => {
                const provider = status.providers[name];
                return (
                  <div key={name} className="flex items-center gap-2">
                    {index > 0 && (
                      <ArrowRight className="h-3.5 w-3.5 text-on-surface-faint" strokeWidth={1.75} />
                    )}
                    <Chip tone={provider?.healthy ? "success" : "error"} className="gap-1.5">
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${provider?.healthy ? "bg-success" : "bg-error"}`}
                      />
                      {name}
                      <span className="text-on-surface-faint">T{provider?.tier ?? "?"}</span>
                    </Chip>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <div className="mt-8">
          <DataTable title="Providers" minWidth={720}>
            <DataTableHead>
              <tr>
                <DataTableTh>Provider</DataTableTh>
                <DataTableTh>Status</DataTableTh>
                <DataTableTh>Tier</DataTableTh>
                <DataTableTh>Type</DataTableTh>
                <DataTableTh>Latency</DataTableTh>
                <DataTableTh>Last check</DataTableTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {loading && providers.length === 0 ? (
                <DataTableEmpty colSpan={6}>Loading provider health…</DataTableEmpty>
              ) : providers.length === 0 ? (
                <DataTableEmpty colSpan={6}>No providers configured.</DataTableEmpty>
              ) : (
                providers.map(([name, provider]) => (
                  <DataTableRow key={name}>
                    <DataTableCell mono>{name}</DataTableCell>
                    <DataTableCell>
                      <Chip tone={provider.healthy ? "success" : "error"} className="gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${provider.healthy ? "bg-success" : "bg-error"}`}
                        />
                        {provider.healthy ? "Healthy" : "Unhealthy"}
                      </Chip>
                    </DataTableCell>
                    <DataTableCell>{provider.tier}</DataTableCell>
                    <DataTableCell>
                      <Chip tone={provider.is_depin ? "info" : "default"}>
                        {provider.is_depin ? "DePIN" : "Centralized"}
                      </Chip>
                    </DataTableCell>
                    <DataTableCell mono>
                      {provider.latency !== null ? formatLatency(provider.latency) : "—"}
                    </DataTableCell>
                    <DataTableCell>{formatLastCheck(provider.last_check)}</DataTableCell>
                  </DataTableRow>
                ))
              )}
            </DataTableBody>
          </DataTable>
        </div>

        <p className="mt-8 text-body-sm text-on-surface-muted">
          Need integration details? See the{" "}
          <Link to="/docs" className="text-primary hover:text-primary-hover">
            API docs
          </Link>{" "}
          for quickstart, models, and routing headers.
        </p>
      </div>
    </PublicLayout>
  );
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone: "success" | "error" | "warning" | "primary" | "info";
  hint: string;
}) {
  const hairline = {
    success: "bg-success",
    error: "bg-error",
    warning: "bg-warning",
    primary: "bg-primary",
    info: "bg-info",
  }[tone];

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${hairline}`} aria-hidden />
      <p className="text-label-sm text-on-surface-muted">{label}</p>
      <p className="mt-2 text-headline-md text-on-surface">{value}</p>
      <p className="mt-2 text-body-sm text-on-surface-faint">{hint}</p>
    </Card>
  );
}
