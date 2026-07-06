import { Card } from "../ui/Card";

interface CodeBlockProps {
  title?: string;
  children: string;
}

export function CodeBlock({ title, children }: CodeBlockProps) {
  return (
    <Card variant="elevated" className="overflow-hidden p-0">
      {title && (
        <div className="border-b border-border px-4 py-2.5">
          <span className="text-mono-sm text-on-surface-faint">{title}</span>
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-mono-sm leading-relaxed text-on-surface-muted">
        <code>{children.trim()}</code>
      </pre>
    </Card>
  );
}
