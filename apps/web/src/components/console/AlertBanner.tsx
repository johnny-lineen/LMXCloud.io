import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";

type AlertTone = "error" | "success" | "info";

interface AlertBannerProps {
  tone: AlertTone;
  children: ReactNode;
  className?: string;
}

const toneStyles: Record<AlertTone, string> = {
  error: "border-error/30 bg-error/10 text-error",
  success: "border-success/30 bg-success/10 text-success",
  info: "border-info/30 bg-info/10 text-info",
};

const icons: Record<AlertTone, typeof AlertCircle> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

export function AlertBanner({ tone, children, className }: AlertBannerProps) {
  const Icon = icons[tone];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-body-sm",
        toneStyles[tone],
        className,
      )}
      role="alert"
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
