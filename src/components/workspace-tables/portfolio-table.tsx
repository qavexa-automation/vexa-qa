"use client";

import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";

import { DataTable } from "@/components/data-table/data-table";
import { filterText, textFilter } from "@/components/data-table/column-filter";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import { useClientTable } from "@/components/data-table/use-client-table";
import { PersonCell, RecordTile, TextCell } from "@/components/workspace-tables/cells";

export type PortfolioRow = {
  id: string;
  name: string;
  developer: string;
  questsDone: number;
  questsTotal: number;
  tests: number;
  openModifications: number;
  deployments: number;
};

const columnHelper = createColumnHelper<DataTableFeatures, PortfolioRow>();
const numeric = { headerClassName: "text-right", cellClassName: "text-right tabular-nums" };

const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    filterFn: filterText,
    sortFn: "text",
    meta: { filter: textFilter("Project name"), cellClassName: "font-medium" },
    cell: ({ getValue }) => <TextCell value={getValue()} />,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Project name" />,
  }),
  columnHelper.accessor("developer", {
    filterFn: filterText,
    meta: { filter: textFilter("Developer") },
    sortFn: "text",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Developer" />,
    cell: ({ row }) => <PersonCell name={row.original.developer} />,
  }),
  columnHelper.accessor("questsDone", {
    sortFn: "basic",
    meta: { ...numeric, label: "Quests completed" },
    header: ({ column }) => (
      <DataTableColumnHeader align="end" column={column} title="Quests completed" />
    ),
    cell: ({ row }) => `${row.original.questsDone} / ${row.original.questsTotal}`,
  }),
  columnHelper.accessor("tests", {
    sortFn: "basic",
    meta: { ...numeric, label: "Tests" },
    header: ({ column }) => <DataTableColumnHeader align="end" column={column} title="Tests" />,
  }),
  columnHelper.accessor("openModifications", {
    sortFn: "basic",
    meta: { ...numeric, label: "Open modifications" },
    header: ({ column }) => (
      <DataTableColumnHeader align="end" column={column} title="Open modifications" />
    ),
  }),
  columnHelper.accessor("deployments", {
    sortFn: "basic",
    meta: { ...numeric, label: "Deployments" },
    header: ({ column }) => (
      <DataTableColumnHeader align="end" column={column} title="Deployments" />
    ),
  }),
]);

export function PortfolioTable({ rows }: { rows: PortfolioRow[] }) {
  const data = useMemo(() => rows, [rows]);
  const table = useClientTable({
    storageKey: "portfolio",
    columns,
    data,
    getRowId: (row) => row.id,
  });
  if (!data.length) return null;
  return (
    <DataTable
      exportName="Project portfolio"
      ariaLabel="Project portfolio"
      renderTile={(row) => (
        <RecordTile
          meta={[
            { label: "Developer", value: row.developer || "—" },
            { label: "Quests completed", value: `${row.questsDone} / ${row.questsTotal}` },
            { label: "Tests", value: row.tests },
            { label: "Open modifications", value: row.openModifications },
          ]}
          title={row.name}
        />
      )}
      table={table}
    />
  );
}
