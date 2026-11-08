"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getStatusLabel, type SampleRecord } from "@/features/design-system/lib/sample-records";

const columnHelper = createColumnHelper<DataTableFeatures, SampleRecord>();

export function createSampleRecordColumns(
  onSort: (next: { id: keyof SampleRecord; desc: boolean } | null) => void,
) {
  const handleSort = (next: { id: string; desc: boolean } | null) =>
    onSort(next as { id: keyof SampleRecord; desc: boolean } | null);

  return columnHelper.columns([
    columnHelper.accessor("name", {
      meta: { label: "Record" },
      header: ({ column }) => <DataTableColumnHeader column={column} onSort={handleSort} title="Record" />,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{row.original.id}</p>
        </div>
      ),
    }),
    columnHelper.accessor("owner", {
      meta: { label: "Owner", cellClassName: "text-muted-foreground" },
      header: ({ column }) => <DataTableColumnHeader column={column} onSort={handleSort} title="Owner" />,
    }),
    columnHelper.accessor("status", {
      enableSorting: false,
      meta: { label: "Status" },
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "archived" ? "outline" : row.original.status === "pending" ? "secondary" : "default"}>
          {getStatusLabel(row.original.status)}
        </Badge>
      ),
    }),
    columnHelper.accessor("updatedAt", {
      enableSorting: false,
      meta: { label: "Updated", cellClassName: "text-muted-foreground" },
      header: "Updated",
    }),
    columnHelper.display({
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      meta: { cellClassName: "w-px", headerClassName: "w-px" },
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button aria-label={`Actions for ${row.original.name}`} size="icon-sm" variant="ghost" />}>
            <MoreHorizontal aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuItem>Edit record</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Archive record</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    }),
  ]);
}
