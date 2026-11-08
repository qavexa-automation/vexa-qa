import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ChartSeries = {
  key: string;
  label: string;
  /** A background utility bound to a chart token, never a raw colour. */
  swatchClassName: string;
  /** A line series takes a line-shaped key so the legend matches the mark. */
  shape?: "square" | "line";
};

/**
 * The shell every chart shares: a caption that names what is plotted, a legend
 * whenever there is more than one series, the plot itself, and a table view so
 * the figures are never gated behind colour or a hover.
 */
export function ChartFrame({
  title,
  subtitle,
  series = [],
  action,
  children,
  table,
  className,
}: {
  title: string;
  subtitle?: string;
  series?: ChartSeries[];
  action?: ReactNode;
  children: ReactNode;
  table: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("overflow-hidden rounded-xl border border-border glass-inset", className)}>
      <figcaption className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-medium tracking-tight">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </figcaption>

      <div className="px-4 pt-4">
        {series.length > 1 ? <ChartLegend series={series} /> : null}
        {children}
      </div>

      <details className="group border-t border-border">
        <summary className="cursor-pointer list-none px-4 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
          <span className="group-open:hidden">View the figures</span>
          <span className="hidden group-open:inline">Hide the figures</span>
        </summary>
        <div className="overflow-x-auto px-4 pb-4">{table}</div>
      </details>
    </figure>
  );
}

/**
 * Identity never rests on colour alone: the swatch sits beside a written label,
 * and the label wears a text token rather than the series colour.
 */
export function ChartLegend({ series }: { series: ChartSeries[] }) {
  return (
    <ul className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {series.map((item) => (
        <li className="flex items-center gap-1.5 text-xs text-muted-foreground" key={item.key}>
          <span
            aria-hidden="true"
            className={cn(
              "shrink-0",
              item.shape === "line" ? "h-0.5 w-4 rounded-full" : "size-2 rounded-[2px]",
              item.swatchClassName,
            )}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** The table view behind every chart. */
export function ChartTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: { key: string; cells: ReactNode[] }[];
}) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border text-left text-muted-foreground">
          {columns.map((column, index) => (
            <th
              className={cn("py-1.5 font-medium", index > 0 && "text-right")}
              key={column}
              scope="col"
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr className="border-b border-border last:border-b-0" key={row.key}>
            {row.cells.map((cell, index) => (
              <td className={cn("py-1.5", index > 0 && "text-right tabular-nums")} key={index}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
