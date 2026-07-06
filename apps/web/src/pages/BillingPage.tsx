import { useCallback, useEffect, useState } from "react";
import { fetchBalance, fetchKeys, topUpCredits } from "../api";
import { AlertBanner } from "../components/console/AlertBanner";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHead,
  DataTableRow,
  DataTableTh,
} from "../components/console/DataTable";
import { PageHeader } from "../components/console/PageHeader";
import { StatCard } from "../components/StatCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Chip } from "../components/ui/Chip";
import { useAuth } from "../context/AuthContext";
import { formatUsd } from "../lib/format";
import type { ApiKeyInfo } from "../types";

const TOP_UP_AMOUNTS = [1, 5, 10] as const;

export function BillingPage() {
  const { apiKey } = useAuth();
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [sessionBalance, setSessionBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [topUpLoading, setTopUpLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiKey) return;
    setLoading(true);
    try {
      const [keysRes, balanceRes] = await Promise.all([
        fetchKeys(apiKey),
        fetchBalance(apiKey),
      ]);
      setKeys(keysRes.data);
      setSessionBalance(balanceRes.balance);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing");
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleTopUp(amount: number) {
    if (!apiKey) return;
    setTopUpLoading(amount);
    setError(null);
    setSuccess(null);
    try {
      const result = await topUpCredits(apiKey, amount);
      setSessionBalance(result.balance);
      setSuccess(`Added ${formatUsd(amount)} to your session key.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Top-up failed");
    } finally {
      setTopUpLoading(null);
    }
  }

  const totalBalance = keys.reduce((sum, key) => sum + key.balance, 0);
  const currentKey = keys.find((key) => key.is_current);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Account"
        title="Billing"
        description="Credit balances and top-ups for your API keys."
      />

      {error && <AlertBanner tone="error">{error}</AlertBanner>}
      {success && <AlertBanner tone="success">{success}</AlertBanner>}

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Session key balance"
          value={loading ? "…" : formatUsd(sessionBalance ?? 0)}
          tone="success"
          hint={currentKey ? `Key ${currentKey.id.slice(0, 8)}…` : undefined}
        />
        <StatCard
          label="Total account balance"
          value={loading ? "…" : formatUsd(totalBalance)}
          tone="primary"
          hint="Across all linked keys"
        />
      </div>

      <Card accent="info">
        <p className="text-label-sm text-info">Dev top-up</p>
        <h3 className="mt-2 text-title-md text-on-surface">Add credits to session key</h3>
        <p className="mt-2 text-body-sm text-on-surface-muted">
          Development mode only — requires{" "}
          <code className="rounded border border-border bg-background px-1.5 py-0.5 text-mono-sm">
            CREDITS_ALLOW_SELF_TOPUP=true
          </code>{" "}
          on the API.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {TOP_UP_AMOUNTS.map((amount) => (
            <Button
              key={amount}
              type="button"
              variant="secondary"
              disabled={topUpLoading !== null}
              onClick={() => void handleTopUp(amount)}
            >
              {topUpLoading === amount ? "…" : `+ ${formatUsd(amount)}`}
            </Button>
          ))}
        </div>
      </Card>

      <DataTable
        title="Key balances"
        description="Per-key credit balances on your account."
      >
        <DataTableHead>
          <tr>
            <DataTableTh>Key</DataTableTh>
            <DataTableTh>Balance</DataTableTh>
            <DataTableTh>Status</DataTableTh>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {loading ? (
            <DataTableEmpty colSpan={3}>Loading balances…</DataTableEmpty>
          ) : (
            keys.map((key) => (
              <DataTableRow key={key.id}>
                <DataTableCell mono>{key.id.slice(0, 8)}…</DataTableCell>
                <DataTableCell mono className="text-success">
                  {formatUsd(key.balance)}
                </DataTableCell>
                <DataTableCell>
                  {key.balance < 0.01 ? (
                    <Chip tone="warning">Low balance</Chip>
                  ) : key.is_current ? (
                    <Chip tone="primary">Current session</Chip>
                  ) : (
                    <Chip tone="success">Active</Chip>
                  )}
                </DataTableCell>
              </DataTableRow>
            ))
          )}
        </DataTableBody>
      </DataTable>
    </div>
  );
}
