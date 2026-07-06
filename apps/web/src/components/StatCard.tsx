import { cn } from "../lib/cn";

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "primary" | "success" | "info" | "warning";
}

const hairlineTone: Record<NonNullable<StatCardProps["tone"]>, string | null> = {
  default: null,
  primary: "bg-primary",
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
};

export function StatCard({ label, value, hint, tone = "default" }: StatCardProps) {
  const hairline = hairlineTone[tone];

  return (
    <div className="relative flex min-h-[7rem] flex-col overflow-hidden rounded-lg border border-border bg-surface px-5 py-4 transition-colors duration-base ease-standard hover:border-border-strong">
      {hairline && (
        <div className={cn("absolute inset-x-0 top-0 h-0.5", hairline)} aria-hidden />
      )}
      <p className="text-label-sm text-on-surface-muted">{label}</p>
      <p className="mt-2.5 text-metric text-on-surface">{value}</p>
      {hint && (
        <p className="mt-auto pt-2.5 text-body-sm leading-snug text-on-surface-faint">{hint}</p>
      )}
    </div>
  );
}
