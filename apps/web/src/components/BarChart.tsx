import { BarChart3 } from "lucide-react";
import { useMemo } from "react";
import { Card } from "./ui/Card";

const CHART_HEIGHT_PX = 160;

interface BarChartProps {
  title: string;
  labels: string[];
  values: number[];
  valueLabel?: (value: number) => string;
  color?: string;
  /** Fill the last N UTC days with zeros for missing dates. */
  spanDays?: number;
}

function fillDailySeries(
  labels: string[],
  values: number[],
  spanDays: number,
): { labels: string[]; values: number[] } {
  const byDate = new Map(labels.map((label, index) => [label, values[index] ?? 0]));
  const filledLabels: string[] = [];
  const filledValues: number[] = [];
  const today = new Date();

  for (let offset = spanDays - 1; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    date.setUTCDate(date.getUTCDate() - offset);
    const key = date.toISOString().slice(0, 10);
    filledLabels.push(key);
    filledValues.push(byDate.get(key) ?? 0);
  }

  return { labels: filledLabels, values: filledValues };
}

function formatAxisDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  return `${month}-${day}`;
}

export function BarChart({
  title,
  labels,
  values,
  valueLabel = String,
  color = "var(--color-primary)",
  spanDays,
}: BarChartProps) {
  const series = useMemo(() => {
    if (spanDays && spanDays > 0) {
      return fillDailySeries(labels, values, spanDays);
    }
    return { labels, values };
  }, [labels, values, spanDays]);

  const max = Math.max(...series.values, 0);
  const hasActivity = max > 0;

  if (series.labels.length === 0) {
    return (
      <Card accent="primary">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" strokeWidth={1.75} />
          <h3 className="text-title-md text-on-surface">{title}</h3>
        </div>
        <p className="mt-4 text-body-sm text-on-surface-muted">
          No usage data yet. Send inference requests to see activity here.
        </p>
      </Card>
    );
  }

  return (
    <Card accent="primary">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" strokeWidth={1.75} />
          <h3 className="text-title-md text-on-surface">{title}</h3>
        </div>
        {hasActivity && (
          <span className="text-mono-sm text-on-surface-faint">max {valueLabel(max)}</span>
        )}
      </div>

      {!hasActivity ? (
        <div
          className="flex items-center justify-center rounded-md border border-dashed border-border bg-elevated/30 text-body-sm text-on-surface-muted"
          style={{ height: CHART_HEIGHT_PX }}
        >
          No activity in this period
        </div>
      ) : (
        <div>
          <div
            className="relative flex items-end gap-px sm:gap-1"
            style={{ height: CHART_HEIGHT_PX }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 border-b border-border/50"
              style={{ bottom: 0 }}
            />
            {series.values.map((value, index) => {
              const barHeight =
                max > 0 ? Math.round((value / max) * CHART_HEIGHT_PX) : 0;
              const displayHeight = value > 0 ? Math.max(barHeight, 6) : 0;

              return (
                <div
                  key={series.labels[index]}
                  className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
                >
                  <span
                    className={`mb-1 text-mono-sm tabular-nums ${
                      value > 0 ? "text-on-surface-muted" : "text-transparent"
                    }`}
                  >
                    {value > 0 ? valueLabel(value) : "0"}
                  </span>
                  <div
                    className="w-full max-w-10 rounded-t-sm transition-all duration-slow ease-standard sm:max-w-none"
                    style={{
                      height: displayHeight,
                      background: `linear-gradient(to top, ${color}, color-mix(in srgb, ${color} 60%, transparent))`,
                      opacity: value > 0 ? 1 : 0,
                      boxShadow:
                        value > 0
                          ? `0 0 14px color-mix(in srgb, ${color} 30%, transparent)`
                          : undefined,
                    }}
                    title={`${series.labels[index]}: ${valueLabel(value)}`}
                  />
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex gap-px sm:gap-1">
            {series.labels.map((label) => (
              <div key={label} className="min-w-0 flex-1 text-center">
                <span className="text-mono-sm text-on-surface-faint">
                  {formatAxisDate(label)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
