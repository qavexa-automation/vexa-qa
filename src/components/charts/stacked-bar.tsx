import { cn } from "@/lib/utils";

export type StackSegment = {
  key: string;
  label: string;
  value: number;
  className: string;
};

export type StackRow = {
  key: string;
  label: string;
  /** Sits under the label, for example "8 units". */
  caption?: string;
  segments: StackSegment[];
  /** Pinned to the right of the bar. */
  readout: string;
};

/**
 * Horizontal part-to-whole bars, one row per category. Horizontal because the
 * category names are long, and stacked because the question is how a fixed
 * whole divides. Segments are separated by a surface gap, never a stroke.
 */
export function StackedBarRows({
  rows,
  ariaLabel,
  total,
}: {
  rows: StackRow[];
  ariaLabel: string;
  /** When given, every row is drawn against this whole rather than its own. */
  total?: number;
}) {
  return (
    <ul aria-label={ariaLabel} className="space-y-3" role="img">
      {rows.map((row) => {
        const rowTotal = total ?? row.segments.reduce((sum, segment) => sum + segment.value, 0);
        const safeTotal = rowTotal > 0 ? rowTotal : 1;

        return (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-sm">
                {row.label}
                {row.caption ? (
                  <span className="ml-2 text-xs text-muted-foreground">{row.caption}</span>
                ) : null}
              </p>
              <p className="shrink-0 text-sm font-medium tabular-nums">{row.readout}</p>
            </div>

            <div className="mt-1.5 flex h-2.5 gap-0.5 overflow-hidden rounded-[4px] bg-chart-track">
              {row.segments
                .filter((segment) => segment.value > 0)
                .map((segment) => (
                  <span
                    className={cn(
                      "group/seg relative h-full first:rounded-l-[4px] last:rounded-r-[4px]",
                      segment.className,
                    )}
                    key={segment.key}
                    style={{ width: `${(segment.value / safeTotal) * 100}%` }}
                    title={`${segment.label}: ${segment.value}`}
                  />
                ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A single stacked bar with its segments named beneath it. Used where the
 * whole is one figure split into ordered buckets.
 */
export function SingleStackedBar({
  segments,
  ariaLabel,
  formatValue,
}: {
  segments: StackSegment[];
  ariaLabel: string;
  formatValue: (value: number) => string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const safeTotal = total > 0 ? total : 1;
  const visible = segments.filter((segment) => segment.value > 0);

  return (
    <div>
      <div
        aria-label={ariaLabel}
        className="flex h-3 gap-0.5 overflow-hidden rounded-[4px] bg-chart-track"
        role="img"
      >
        {visible.map((segment) => (
          <span
            className={cn("h-full first:rounded-l-[4px] last:rounded-r-[4px]", segment.className)}
            key={segment.key}
            style={{ width: `${(segment.value / safeTotal) * 100}%` }}
            title={`${segment.label}: ${formatValue(segment.value)}`}
          />
        ))}
      </div>

      <ul className="mt-3 grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {segments.map((segment) => (
          <li className="flex items-center justify-between gap-3 text-sm" key={segment.key}>
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <span
                aria-hidden="true"
                className={cn("size-2 shrink-0 rounded-[2px]", segment.className)}
              />
              <span className="truncate">{segment.label}</span>
            </span>
            <span className="shrink-0 tabular-nums">{formatValue(segment.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
