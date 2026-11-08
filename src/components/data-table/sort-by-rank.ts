import type { Row, RowData } from "@tanstack/react-table";

import type { DataTableFeatures } from "@/components/data-table/data-table-features";

/**
 * Sorts a column whose value is a label (so it can be filtered by that label) in a fixed
 * workflow order instead of alphabetically, e.g. Critical before Low.
 */
export const sortByRank =
  <TValue extends string>(rank: (value: TValue) => number) =>
  <TData extends RowData>(
    a: Row<DataTableFeatures, TData>,
    b: Row<DataTableFeatures, TData>,
    columnId: string,
  ) =>
    rank(a.getValue(columnId) as TValue) - rank(b.getValue(columnId) as TValue);
