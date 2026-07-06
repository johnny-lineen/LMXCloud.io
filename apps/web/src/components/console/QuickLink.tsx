import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/cn";

interface QuickLinkProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: "primary" | "info" | "success" | "warning";
}

const accentStyles = {
  primary: "text-primary border-primary/30 bg-primary/10",
  info: "text-info border-info/30 bg-info/10",
  success: "text-success border-success/30 bg-success/10",
  warning: "text-warning border-warning/30 bg-warning/10",
};

export function QuickLink({
  to,
  icon: Icon,
  title,
  description,
  accent = "primary",
}: QuickLinkProps) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-4 rounded-lg border border-border bg-surface p-4 transition-colors duration-base ease-standard hover:border-border-strong hover:bg-elevated"
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border",
          accentStyles[accent],
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-title-md text-on-surface">{title}</p>
          <ArrowRight
            className="h-4 w-4 text-on-surface-faint opacity-0 transition-all duration-base ease-standard group-hover:translate-x-0.5 group-hover:opacity-100"
            strokeWidth={1.75}
          />
        </div>
        <p className="mt-1 text-body-sm text-on-surface-muted">{description}</p>
      </div>
    </Link>
  );
}
