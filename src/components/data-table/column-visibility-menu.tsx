"use client";

import type { Column, ReactTable, RowData } from "@tanstack/react-table";
import { Columns3 } from "lucide-react";

import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import { IconButton } from "@/components/app-shell/icon-button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** The name a person sees for a column: its label, filter label, or plain-text header. */
export function columnLabel<TData extends RowData>(column: Column<DataTableFeatures, TData>) {
  const { meta, header } = column.columnDef;
  return meta?.label ?? meta?.filter?.label ?? (typeof header === "string" ? header : column.id);
}

/** Lets people choose which columns the table shows. The last visible column cannot be hidden. */
export function ColumnVisibilityMenu<TData extends RowData>({
  table,
}: {
  table: ReactTable<DataTableFeatures, TData>;
}) {
  const columns = table.getAllLeafColumns().filter((column) => column.getCanHide());
  const visible = columns.filter((column) => column.getIsVisible());
  const hiddenCount = columns.length - visible.length;

  return (
    <DropdownMenu>
      <IconButton
        ariaLabel={hiddenCount > 0 ? `Columns, ${hiddenCount} hidden` : "Columns"}
        badge={hiddenCount > 0 ? hiddenCount : undefined}
        icon={Columns3}
        label="Columns"
        render={(button) => <DropdownMenuTrigger render={button} />}
        variant="outline"
      />
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Show columns</DropdownMenuLabel>
          {columns.map((column) => (
            <DropdownMenuCheckboxItem
              checked={column.getIsVisible()}
              closeOnClick={false}
              disabled={column.getIsVisible() && visible.length === 1}
              key={column.id}
              onCheckedChange={(checked) => column.toggleVisibility(checked)}
            >
              {columnLabel(column)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {hiddenCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => table.toggleAllColumnsVisible(true)}>
              Show all columns
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
