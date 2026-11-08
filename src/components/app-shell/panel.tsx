import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

/**
 * A workspace section: an optional eyebrow, a title, one optional action, and its content. Content
 * keeps its own padding so tables and lists can run edge to edge.
 */
export function Panel({
  title,
  eyebrow,
  action,
  children,
  className,
  titleId,
}: {
  title: ReactNode;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  titleId?: string;
}) {
  return (
    <section
      aria-labelledby={titleId}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-xl border border-border glass p-4 text-card-foreground shadow-xs sm:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && (
            <span className="text-[0.6875rem] font-semibold tracking-wider text-brand uppercase">
              {eyebrow}
            </span>
          )}
          <h2 className="font-heading text-lg font-semibold tracking-tight" id={titleId}>
            {title}
          </h2>
        </div>
        {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
      </div>
      {children}
    </section>
  );
}

const tones = {
  mint: "bg-brand-subtle text-brand",
  orange: "bg-status-critical-subtle text-status-critical",
  purple: "bg-status-info-subtle text-status-info",
  yellow: "bg-status-attention-subtle text-status-attention",
} as const;
export type StatTone = keyof typeof tones;

/** One headline figure with its icon and a supporting line. */
export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  color,
}: {
  label: string;
  value: ReactNode;
  detail: ReactNode;
  icon: LucideIcon;
  color: StatTone;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-xl border border-border glass p-4 text-card-foreground shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("grid size-8 place-items-center rounded-lg", tones[color])}>
          <Icon aria-hidden="true" className="size-4" />
        </span>
      </div>
      <strong className="font-heading text-3xl leading-none font-semibold tabular-nums">
        {value}
      </strong>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </section>
  );
}

/** What a list shows when it has nothing, with the next useful step when there is one. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon?: LucideIcon;
  title?: ReactNode;
  description: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <Empty className={cn("min-h-40 border border-dashed border-border", className)}>
      <EmptyHeader>
        {Icon && (
          <EmptyMedia variant="icon">
            <Icon aria-hidden="true" />
          </EmptyMedia>
        )}
        {title && <EmptyTitle>{title}</EmptyTitle>}
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}
