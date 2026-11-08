import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A single figure with its label and optional supporting line. Metrics breathe
 * in plain layout rather than each becoming a card.
 */
export function StatTile({
  label,
  value,
  hint,
  action,
  emphasis = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  emphasis?: "default" | "critical" | "positive";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 p-4", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl leading-tight font-semibold tabular-nums",
          emphasis === "critical" && "text-status-critical",
          emphasis === "positive" && "text-status-positive",
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Groups stat tiles behind one hairline grid so they read as one instrument. */
export function StatGrid({
  children,
  className,
  ...props
}: {
  children: ReactNode;
  className?: string;
  "data-tour"?: string;
}) {
  return (
    <div
      {...props}
      className={cn(
        "grid gap-px overflow-hidden rounded-xl glass bg-glass-border ring-1 ring-glass-border [&>*]:bg-glass",
        className,
      )}
    >
      {children}
    </div>
  );
}
