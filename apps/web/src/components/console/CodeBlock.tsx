import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";

interface CodeBlockProps {
  code: string;
  label?: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, label, language, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className={cn("overflow-hidden rounded-md border border-border bg-background", className)}>
      {(label || language) && (
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-label-sm text-on-surface-muted">
            {label ?? language}
          </span>
          <Button type="button" variant="tertiary" size="sm" onClick={() => void handleCopy()}>
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                Copy
              </>
            )}
          </Button>
        </div>
      )}
      <div className="relative">
        {!label && !language && (
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            className="absolute right-2 top-2 z-10"
            onClick={() => void handleCopy()}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" strokeWidth={1.75} />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                Copy
              </>
            )}
          </Button>
        )}
        <pre className="overflow-x-auto p-4 text-mono-sm text-on-surface">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
