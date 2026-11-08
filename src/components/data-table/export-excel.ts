import type { ReactTable, RowData } from "@tanstack/react-table";

import { columnLabel } from "@/components/data-table/column-visibility-menu";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import {
  buildWorkbook,
  excelFileName,
  excelKind,
  excelWidth,
} from "@/components/data-table/excel-layout";

/**
 * Downloads what the table shows: visible data columns, in order, over the current filtered and
 * sorted rows.
 */
export async function exportTableToExcel<TData extends RowData>(
  table: ReactTable<DataTableFeatures, TData>,
  name: string,
) {
  const columns = table
    .getVisibleLeafColumns()
    .filter((column) => Boolean(column.columnDef.meta?.filter || column.accessorFn));
  const rows = table.getRowModel().rows;

  const layout = columns.flatMap((column) => {
    const values = rows.map((row) => row.getValue(column.id));
    const filterKind = column.columnDef.meta?.filter?.kind;
    const hint =
      filterKind === "date"
        ? "date"
        : filterKind === "options"
          ? "status"
          : values.every((value) => typeof value === "number")
            ? "number"
            : "text";
    const kind = excelKind(values, hint);
    const header = columnLabel(column);
    const filter = column.columnDef.meta?.filter;
    const entry = {
      header,
      kind,
      values,
      width: excelWidth(header, values, kind),
      options: filter?.kind === "options" ? filter.options : undefined,
    };
    if (!column.columnDef.meta?.exportId) return [entry];
    const ids = rows.map((row) => (row.original as { id?: unknown }).id);
    return [
      { header: "ID", kind: "text" as const, values: ids, width: excelWidth("ID", ids, "text") },
      entry,
    ];
  });

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  const filters = table
    .getAllLeafColumns()
    .filter((column) => column.getIsFiltered())
    .map((column) => columnLabel(column));
  const buffer = await buildWorkbook(name, layout, { exportedOn: today, filters });
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = excelFileName(name, today);
  link.click();
  URL.revokeObjectURL(url);
}
