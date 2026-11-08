import type { Row, RowData } from "@tanstack/react-table";

import type { DataTableFeatures } from "./data-table-features";

/** How a column can be filtered. Declared on the column's `meta.filter`. */
export type ColumnFilterConfig =
  | { kind: "text"; label: string }
  | { kind: "options"; label: string; options: readonly string[] }
  | { kind: "date"; label: string };

export type DateRange = { from?: string; to?: string };
type TableRow<TData extends RowData> = Row<DataTableFeatures, TData>;

// Each filter reads the column's accessor value, so text and option columns expose their label
// and date columns expose a YYYY-MM-DD string (empty when unknown).
export const filterText = <TData extends RowData>(
  row: TableRow<TData>,
  columnId: string,
  value: string,
) =>
  String(row.getValue(columnId) ?? "")
    .toLowerCase()
    .includes(value.trim().toLowerCase());
export const filterOptions = <TData extends RowData>(
  row: TableRow<TData>,
  columnId: string,
  values: string[],
) => values.includes(String(row.getValue(columnId) ?? ""));
export const filterDateRange = <TData extends RowData>(
  row: TableRow<TData>,
  columnId: string,
  { from, to }: DateRange,
) => {
  const date = String(row.getValue(columnId) ?? "");
  if (!date) return false;
  return (!from || date >= from) && (!to || date <= to);
};

// Pair each config with its filter function on the column: `filterFn: filterText` and
// `meta: { filter: textFilter("Module") }`.
export const textFilter = (label: string): ColumnFilterConfig => ({ kind: "text", label });
export const optionsFilter = (label: string, options: readonly string[]): ColumnFilterConfig => ({
  kind: "options",
  label,
  options,
});
export const dateFilter = (label: string): ColumnFilterConfig => ({ kind: "date", label });
