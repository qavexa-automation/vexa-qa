"use client";

import { useState } from "react";
import type { ReactTable, RowData } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { toast } from "sonner";

import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

/** Exports the rows and columns currently shown to a formatted .xlsx file. */
export function ExportExcelButton<TData extends RowData>({
  table,
  name,
}: {
  table: ReactTable<DataTableFeatures, TData>;
  name: string;
}) {
  const [pending, setPending] = useState(false);
  const count = table.getRowModel().rows.length;

  return (
    <Button
      aria-label={`Export ${count} ${name.toLowerCase()} to Excel`}
      disabled={pending || count === 0}
      size="sm"
      variant="outline"
      onClick={async () => {
        setPending(true);
        try {
          const { exportTableToExcel } = await import("@/components/data-table/export-excel");
          await exportTableToExcel(table, name);
          toast.success(`Exported ${count} ${count === 1 ? "row" : "rows"} to Excel`);
        } catch {
          toast.error("The Excel file could not be created. Try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? <Spinner aria-hidden="true" /> : <Download aria-hidden="true" />}
      Export
    </Button>
  );
}
