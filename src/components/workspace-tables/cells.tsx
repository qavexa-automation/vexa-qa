"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatModificationDate, toModificationDate } from "@/lib/modifications";

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (
    parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2)
  ).toUpperCase();
}

/** A person's initials with their name beside them, so the name never hides in a tooltip. */
export function PersonCell({ name }: { name: string }) {
  if (!name.trim()) return <span className="text-muted-foreground">—</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <Avatar size="sm">
        <AvatarFallback>{initials(name)}</AvatarFallback>
      </Avatar>
      <span className="max-w-44 truncate" title={name}>
        {name}
      </span>
    </span>
  );
}

/** A calendar date, with the ISO day as its machine-readable value. */
export function DateCell({ value }: { value?: string | null }) {
  const date = toModificationDate(value);
  if (!date) return <span className="text-muted-foreground">—</span>;
  return (
    <time className="whitespace-nowrap tabular-nums" dateTime={date}>
      {formatModificationDate(date)}
    </time>
  );
}

/**
 * Long free text, clamped to two lines so one record cannot stretch the row. Show more expands it
 * in place; the link only appears when the text is actually cut off. Input is unlimited.
 */
export function LongTextCell({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const text = useRef<HTMLParagraphElement>(null);

  // Measure while collapsed, and again whenever the column width changes.
  useEffect(() => {
    const element = text.current;
    if (!element || expanded) return;
    const measure = () => setClamped(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [value, expanded]);

  if (!value.trim()) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="w-72">
      <p className={cn("whitespace-pre-line break-words", !expanded && "line-clamp-2")} ref={text}>
        {value}
      </p>
      {(clamped || expanded) && (
        <Button
          aria-expanded={expanded}
          className="mt-0.5 h-auto p-0 text-xs"
          size="xs"
          type="button"
          variant="link"
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      )}
    </div>
  );
}

/** Short text on one line, cut with an ellipsis past the column limit; full text on hover. */
export function TextCell({ value, className }: { value: unknown; className?: string }) {
  const text = String(value ?? "").trim();
  if (!text) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={`block max-w-56 truncate ${className ?? ""}`} title={text}>
      {text}
    </span>
  );
}

export const dateValue = (value?: string | null) => (value ? Date.parse(value) || 0 : 0);

/** A record on a phone: identity and status first, then only the details needed to act. */
export function RecordTile({
  title,
  subtitle,
  status,
  meta,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  meta: { label: string; value: ReactNode }[];
  action?: ReactNode;
}) {
  return (
    <article className="rounded-xl border border-border glass-inset p-4 text-sm text-card-foreground shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {subtitle && <p className="font-mono text-xs text-muted-foreground">{subtitle}</p>}
          <h3 className="font-medium break-words">{title}</h3>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {status}
          {action}
        </div>
      </div>
      {meta.length > 0 && (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
          {meta.map((item) => (
            <div className="min-w-0" key={item.label}>
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="mt-0.5 truncate">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}
