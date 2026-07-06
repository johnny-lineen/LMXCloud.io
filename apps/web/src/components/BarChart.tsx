import { BarChart3 } from "lucide-react";
import { Card } from "./ui/Card";

interface BarChartProps {
  title: string;
  labels: string[];
  values: number[];
  valueLabel?: (value: number) => string;
  color?: string;
}

export function BarChart({
  title,
  labels,
  values,
  valueLabel = String,
  color = "var(--color-primary)",
}: BarChartProps) {
  const max = Math.max(...values, 1);

  if (labels.length === 0) {
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
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" strokeWidth={1.75} />
          <h3 className="text-title-md text-on-surface">{title}</h3>
        </div>
      </div>
      <div className="flex h-48 items-end gap-1.5 sm:gap-2">
        {values.map((value, index) => (
          <div key={labels[index]} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="text-mono-sm text-on-surface-faint">{valueLabel(value)}</span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-sm transition-all duration-slow ease-standard"
                style={{
                  height: `${Math.max((value / max) * 100, value > 0 ? 8 : 0)}%`,
                  background: `linear-gradient(to top, ${color}, color-mix(in srgb, ${color} 65%, transparent))`,
                  minHeight: value > 0 ? "4px" : "0",
                  boxShadow: value > 0 ? `0 0 12px color-mix(in srgb, ${color} 25%, transparent)` : undefined,
                }}
                title={`${labels[index]}: ${valueLabel(value)}`}
              />
            </div>
            <span className="truncate text-mono-sm text-on-surface-faint">
              {labels[index].slice(5)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
