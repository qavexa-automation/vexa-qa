"use client";

import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import {
  filterOptions,
  filterText,
  optionsFilter,
  textFilter,
} from "@/components/data-table/column-filter";
import { sortByRank } from "@/components/data-table/sort-by-rank";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import { editDeleteActions, RowActions } from "@/components/data-table/row-actions";
import { useClientTable } from "@/components/data-table/use-client-table";
import { InlineStatusSelect } from "@/components/forms/inline-status-select";
import { LongTextCell, RecordTile, TextCell } from "@/components/workspace-tables/cells";
import { TEST_STATUSES, type TestCase } from "@/lib/model";
import { testStatusRank, testStatusTone } from "@/lib/status-tones";

type TestStatus = TestCase["status"];
const columnHelper = createColumnHelper<DataTableFeatures, TestCase>();

function TestStatusCombobox({
  test,
  onChange,
}: {
  test: TestCase;
  onChange: (status: TestStatus) => void;
}) {
  return (
    <InlineStatusSelect
      label={`Status for ${test.id}: ${test.title}`}
      onChange={onChange}
      options={TEST_STATUSES}
      tone={testStatusTone}
      value={test.status}
    />
  );
}

export default function TestCaseTable({
  tests,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  tests: TestCase[];
  onEdit: (test: TestCase) => void;
  onDelete: (test: TestCase) => void;
  onStatusChange: (id: string, status: TestStatus) => void;
}) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("title", {
          filterFn: filterText,
          meta: { filter: textFilter("Test case"), exportId: true },
          sortFn: "text",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Test case" />,
          cell: ({ row }) => (
            <button
              aria-label={`Edit ${row.original.id}: ${row.original.title}`}
              className="group block min-w-48 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              onClick={() => onEdit(row.original)}
              type="button"
            >
              <span className="block font-mono text-xs text-muted-foreground">
                {row.original.id}
              </span>
              <span
                className="block max-w-72 truncate font-medium group-hover:underline"
                title={row.original.title}
              >
                {row.original.title}
              </span>
            </button>
          ),
        }),
        columnHelper.accessor("suite", {
          filterFn: filterText,
          meta: { filter: textFilter("Module") },
          sortFn: "text",
          cell: ({ getValue }) => <TextCell value={getValue()} />,
          header: ({ column }) => <DataTableColumnHeader column={column} title="Module" />,
        }),
        columnHelper.accessor("steps", {
          filterFn: filterText,
          meta: { filter: textFilter("Steps to execute") },
          enableSorting: false,
          header: "Steps to execute",
          cell: ({ row }) => <LongTextCell value={row.original.steps} />,
        }),
        columnHelper.accessor("expected", {
          filterFn: filterText,
          meta: { filter: textFilter("Expected result") },
          enableSorting: false,
          header: "Expected result",
          cell: ({ row }) => <LongTextCell value={row.original.expected} />,
        }),
        columnHelper.accessor((test) => test.status, {
          filterFn: filterOptions,
          meta: { filter: optionsFilter("Status", TEST_STATUSES) },
          id: "status",
          sortFn: sortByRank(testStatusRank),
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }) => (
            <TestStatusCombobox
              onChange={(status) => onStatusChange(row.original.id, status)}
              test={row.original}
            />
          ),
        }),
        columnHelper.display({
          id: "actions",
          enableHiding: false,
          meta: { cellClassName: "w-px", headerClassName: "w-px" },
          header: () => <span className="sr-only">Actions</span>,
          cell: ({ row }) => (
            <RowActions
              revealOnHover
              actions={editDeleteActions(
                "test case",
                () => onEdit(row.original),
                () => onDelete(row.original),
                { edit: Pencil, delete: Trash2 },
              )}
              subject={`${row.original.id}: ${row.original.title}`}
            />
          ),
        }),
      ]),
    [onEdit, onDelete, onStatusChange],
  );
  const table = useClientTable({
    storageKey: "test-cases",
    columns,
    data: tests,
    getRowId: (test) => test.id,
  });
  if (!tests.length) return null;
  return (
    <DataTable
      exportName="Test cases"
      ariaLabel="Test cases"
      renderTile={(test) => (
        <RecordTile
          action={
            <RowActions
              actions={editDeleteActions(
                "test case",
                () => onEdit(test),
                () => onDelete(test),
                { edit: Pencil, delete: Trash2 },
              )}
              subject={`${test.id}: ${test.title}`}
            />
          }
          meta={[
            { label: "Module", value: test.suite || "—" },
            {
              label: "Status",
              value: (
                <TestStatusCombobox
                  onChange={(status) => onStatusChange(test.id, status)}
                  test={test}
                />
              ),
            },
          ]}
          subtitle={test.id}
          title={test.title}
        />
      )}
      table={table}
    />
  );
}
