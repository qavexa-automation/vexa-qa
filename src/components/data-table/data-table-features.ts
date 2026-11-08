import {
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
} from "@tanstack/react-table";

import type { ColumnFilterConfig } from "./column-filter-fns";

export type DataTableColumnMeta = {
  cellClassName?: string;
  headerClassName?: string;
  label?: string;
  /** Shows a filter beside the header; pair it with the matching `filterFn`. */
  filter?: ColumnFilterConfig;
  /** Excel exports put the record ID in its own column before this one. */
  exportId?: boolean;
};

// The filtered and sorted row models serve VEXA's in-memory workspace lists. Server-paged views
// still pass `manualSorting`/`manualFiltering`, which skip them and keep the server's result.
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
  },
  columnMeta: {} as DataTableColumnMeta,
});

export type DataTableFeatures = typeof dataTableFeatures;
