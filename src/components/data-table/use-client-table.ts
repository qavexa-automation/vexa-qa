"use client";

import { useEffect, useState } from "react";
import { useTable, type ColumnVisibilityState, type RowData } from "@tanstack/react-table";

import { dataTableFeatures } from "@/components/data-table/data-table-features";
import type { ResourceColumns } from "@/components/data-table/resource-view";

const storageName = (key: string) => `vexa-table-columns:${key}`;

/**
 * A table over rows already in memory, such as the workspace lists. Sorting and column filters
 * run in the browser; there is no paging because each list is already scoped to one workspace.
 * Hidden columns are a per-browser preference, remembered under `storageKey`.
 */
export function useClientTable<TRow extends RowData>({
  columns,
  data,
  getRowId,
  storageKey,
  enableSorting = true,
}: {
  columns: ResourceColumns<TRow>;
  data: TRow[];
  getRowId: (row: TRow) => string;
  storageKey: string;
  enableSorting?: boolean;
}) {
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibilityState>({});

  // Read after mount so the server and first client render agree.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageName(storageKey));
      if (saved) setColumnVisibility(JSON.parse(saved) as ColumnVisibilityState);
    } catch {
      // A blocked or corrupt preference just shows every column.
    }
  }, [storageKey]);

  return useTable({
    columns,
    data,
    features: dataTableFeatures,
    getRowId,
    enableSorting,
    state: { columnVisibility },
    onColumnVisibilityChange: (updater) =>
      setColumnVisibility((previous) => {
        const next = typeof updater === "function" ? updater(previous) : updater;
        try {
          window.localStorage.setItem(storageName(storageKey), JSON.stringify(next));
        } catch {
          // The choice still applies for this visit.
        }
        return next;
      }),
  });
}
