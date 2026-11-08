"use client";

import type { ReactNode } from "react";
import { FlexRender, type ReactTable, type RowData } from "@tanstack/react-table";

import { FilterX } from "lucide-react";

import { ColumnFilter } from "@/components/data-table/column-filter";
import { ExportExcelButton } from "@/components/data-table/export-excel-button";
import { ColumnVisibilityMenu, columnLabel } from "@/components/data-table/column-visibility-menu";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function DataTable<TData extends RowData>({
  table,
  ariaLabel,
  isPending = false,
  empty,
  renderTile,
  exportName,
}: {
  table: ReactTable<DataTableFeatures, TData>;
  ariaLabel: string;
  isPending?: boolean;
  empty?: ReactNode;
  /**
   * Below the md breakpoint the rows render as these tiles instead of table columns, in the
   * same sorted order, so phones never scroll a table sideways.
   */
  renderTile?: (row: TData) => ReactNode;
  /** Shows an Export button that downloads the shown rows and columns as "<name>" in Excel. */
  exportName?: string;
}) {
  const rows = table.getRowModel().rows;
  const visibleColumnCount = table.getVisibleLeafColumns().length;
  const filtered = table.getAllLeafColumns().filter((column) => column.getIsFiltered());
  const filterBar = filtered.length > 0 && (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" role="status">
      <span>
        {rows.length} {rows.length === 1 ? "match" : "matches"} ·{" "}
        {filtered.map((column) => columnLabel(column)).join(", ")}
      </span>
      <Button size="xs" variant="ghost" onClick={() => table.resetColumnFilters()}>
        <FilterX aria-hidden="true" />
        Clear column filters
      </Button>
    </div>
  );
  // Columns only exist in the table view, so the chooser is hidden with it on phones.
  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {filterBar || <span />}
      <div className="flex items-center gap-2">
        {exportName && <ExportExcelButton name={exportName} table={table} />}
        <div className="hidden md:block">
          <ColumnVisibilityMenu table={table} />
        </div>
      </div>
    </div>
  );
  const noMatches = (
    <div className="grid min-h-32 place-items-center p-6 text-center">
      <div>
        <p className="font-medium">No records match the column filters</p>
        <Button
          className="mt-2"
          size="sm"
          variant="outline"
          onClick={() => table.resetColumnFilters()}
        >
          <FilterX aria-hidden="true" />
          Clear column filters
        </Button>
      </div>
    </div>
  );
  const emptyContent = filtered.length ? noMatches : empty;

  const tableView = (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border glass-inset shadow-xs",
        isPending && "pointer-events-none opacity-60 select-none",
      )}
    >
      <Table aria-busy={isPending} aria-label={ariaLabel}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="bg-muted/40 hover:bg-muted/40" key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  className={cn(
                    "px-3 text-xs font-medium text-muted-foreground",
                    header.column.columnDef.meta?.headerClassName,
                  )}
                  key={header.id}
                >
                  {header.isPlaceholder ? null : (
                    <div
                      className={cn(
                        "flex items-center gap-1",
                        header.column.columnDef.meta?.headerClassName?.includes("text-right") &&
                          "justify-end",
                      )}
                    >
                      <FlexRender header={header} />
                      {header.column.columnDef.meta?.filter && header.column.getCanFilter() && (
                        <ColumnFilter
                          column={header.column}
                          config={header.column.columnDef.meta.filter}
                        />
                      )}
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length ? (
            rows.map((row) => (
              <TableRow className="group/row h-12" key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    className={cn("px-3", cell.column.columnDef.meta?.cellClassName)}
                    key={cell.id}
                  >
                    <FlexRender cell={cell} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell className="p-0" colSpan={visibleColumnCount || 1}>
                {emptyContent}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
  if (!renderTile)
    return (
      <div className="flex flex-col gap-2">
        {toolbar}
        {tableView}
      </div>
    );
  return (
    <div className="flex flex-col gap-2">
      {toolbar}
      <div className="hidden md:block">{tableView}</div>
      <ul aria-label={ariaLabel} aria-busy={isPending} className="flex flex-col gap-2 md:hidden">
        {rows.length ? (
          rows.map((row) => <li key={row.id}>{renderTile(row.original)}</li>)
        ) : (
          <li className="rounded-xl border border-border glass-inset">{emptyContent}</li>
        )}
      </ul>
    </div>
  );
}
