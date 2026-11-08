"use client";

import type { CellData, Column, RowData } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DataTableColumnHeader<TData extends RowData, TValue extends CellData = CellData>({
  column,
  title,
  align = "start",
  onSort,
}: {
  column: Column<DataTableFeatures, TData, TValue>;
  title: string;
  align?: "start" | "end";
  onSort?: (next: { id: string; desc: boolean } | null) => void;
}) {
  if (!column.getCanSort()) {
    return <span className={cn("block", align === "end" && "text-right")}>{title}</span>;
  }

  const sorted = column.getIsSorted();
  const Icon = sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ChevronsUpDown;

  function cycleSort() {
    const next =
      sorted === false
        ? { id: column.id, desc: false }
        : sorted === "asc"
          ? { id: column.id, desc: true }
          : null;

    if (onSort) {
      onSort(next);
    } else if (next === null) {
      column.clearSorting();
    } else {
      column.toggleSorting(next.desc);
    }
  }

  return (
    <Button
      aria-label={`Sort by ${title}`}
      className={cn(
        "-mx-2 h-7 gap-1 px-2 text-xs font-medium text-muted-foreground",
        align === "end" && "ml-auto",
      )}
      onClick={cycleSort}
      size="sm"
      variant="ghost"
    >
      {title}
      <Icon className={cn("size-3.5", sorted === false && "opacity-50")} />
    </Button>
  );
}
