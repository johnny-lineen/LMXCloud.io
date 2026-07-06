import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Card } from "../ui/Card";

interface DataTableProps {
  title?: string;
  description?: string;
  minWidth?: number;
  children: ReactNode;
  className?: string;
}

export function DataTable({
  title,
  description,
  minWidth,
  children,
  className,
}: DataTableProps) {
  return (
    <Card variant="base" className={cn("overflow-hidden p-0", className)}>
      {(title || description) && (
        <div className="border-b border-border px-5 py-4">
          {title && <h3 className="text-title-md text-on-surface">{title}</h3>}
          {description && (
            <p className="mt-1 text-body-sm text-on-surface-muted">{description}</p>
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table
          className="w-full text-left text-body-sm"
          style={minWidth ? { minWidth } : undefined}
        >
          {children}
        </table>
      </div>
    </Card>
  );
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-border bg-elevated/40 text-label-sm text-on-surface-muted">
      {children}
    </thead>
  );
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function DataTableRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        "border-b border-border/60 transition-colors duration-base ease-standard last:border-0 hover:bg-elevated/30",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function DataTableCell({
  children,
  className,
  mono,
  title,
}: {
  children: ReactNode;
  className?: string;
  mono?: boolean;
  title?: string;
}) {
  return (
    <td title={title} className={cn("px-5 py-3.5", mono && "text-mono-sm", className)}>
      {children}
    </td>
  );
}

export function DataTableTh({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <th className={cn("px-5 py-3 font-medium", className)}>{children}</th>;
}

export function DataTableEmpty({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-12 text-center text-on-surface-muted">
        {children}
      </td>
    </tr>
  );
}
