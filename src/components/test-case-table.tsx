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
import { InlineTextEdit } from "@/components/forms/inline-text-edit";
import { LongTextCell, RecordTile, TextCell } from "@/components/workspace-tables/cells";
import { TEST_STATUSES, type TestCase } from "@/lib/model";
import { testStatusRank, testStatusTone } from "@/lib/status-tones";
import { AttachmentCell, type Attachment } from "@/features/attachments";

const ATTACHMENT_PRESENCE = ["Attached", "None"] as const;

type TestStatus = TestCase["status"];
const columnHelper = createColumnHelper<DataTableFeatures, TestCase>();

function TestStatusCombobox({
  test,
  onChange,
  readOnly = false,
}: {
  test: TestCase;
  onChange: (status: TestStatus) => void;
  readOnly?: boolean;
}) {
  return (
    <InlineStatusSelect
      readOnly={readOnly}
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
  onRemarksChange,
  onAttach,
  onDetach,
  onLoadAttachment,
  uploadingId,
  canAttach,
  readOnly = false,
}: {
  tests: TestCase[];
  onEdit: (test: TestCase) => void;
  onDelete: (test: TestCase) => void;
  onStatusChange: (id: string, status: TestStatus) => void;
  onRemarksChange: (id: string, remarks: string) => void;
  /** Compresses and uploads dropped, pasted, or browsed files. */
  onAttach: (test: TestCase, files: File[]) => void;
  onDetach: (test: TestCase, attachment: Attachment) => void;
  onLoadAttachment: (attachment: Attachment) => Promise<Blob>;
  /** The record whose upload is in flight, if any. */
  uploadingId: string | null;
  canAttach: boolean;
  readOnly?: boolean;
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
              aria-label={`${readOnly ? "Edit developer remarks for" : "Edit"} ${row.original.id}: ${row.original.title}`}
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
              readOnly={readOnly}
              onChange={(status) => onStatusChange(row.original.id, status)}
              test={row.original}
            />
          ),
        }),
        columnHelper.accessor((test) => test.developerRemarks ?? "", {
          id: "developerRemarks",
          filterFn: filterText,
          meta: { filter: textFilter("Developer remarks") },
          enableSorting: false,
          header: "Developer remarks",
          cell: ({ getValue, row }) => (
            <InlineTextEdit
              label={`Developer remarks for ${row.original.id}: ${row.original.title}`}
              value={getValue()}
              onChange={(remarks) => onRemarksChange(row.original.id, remarks)}
            />
          ),
        }),
        // The column filters and sorts on the human label, so "Attached" / "None" is what the
        // header filter and an export show; the cell itself stays interactive.
        columnHelper.accessor((test) => (test.attachments?.length ? "Attached" : "None"), {
          filterFn: filterOptions,
          meta: {
            filter: optionsFilter("Attachments", ATTACHMENT_PRESENCE),
            cellClassName: "min-w-44",
          },
          id: "attachments",
          sortFn: "text",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Attachments" />,
          cell: ({ row }) => (
            <AttachmentCell
              attachments={row.original.attachments ?? []}
              busy={uploadingId === row.original.id}
              disabled={!canAttach}
              readOnly={readOnly}
              onAdd={(files) => onAttach(row.original, files)}
              onLoad={onLoadAttachment}
              onRemove={(attachment) => onDetach(row.original, attachment)}
              subject={`${row.original.id}: ${row.original.title}`}
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
              actions={readOnly ? [{ label: "Edit developer remarks", icon: Pencil, onSelect: () => onEdit(row.original) }] : editDeleteActions(
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
    [
      onEdit,
      onDelete,
      onStatusChange,
      onRemarksChange,
      onAttach,
      onDetach,
      onLoadAttachment,
      uploadingId,
      canAttach,
      readOnly,
    ],
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
              actions={readOnly ? [{ label: "Edit developer remarks", icon: Pencil, onSelect: () => onEdit(test) }] : editDeleteActions(
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
                  readOnly={readOnly}
                  onChange={(status) => onStatusChange(test.id, status)}
                  test={test}
                />
              ),
            },
            {
              label: "Developer remarks",
              value: (
                <InlineTextEdit
                  className="w-full"
                  label={`Developer remarks for ${test.id}: ${test.title}`}
                  value={test.developerRemarks ?? ""}
                  onChange={(remarks) => onRemarksChange(test.id, remarks)}
                />
              ),
            },
            {
              label: "Attachments",
              value: (
                <AttachmentCell
                  attachments={test.attachments ?? []}
                  busy={uploadingId === test.id}
                  disabled={!canAttach}
                  readOnly={readOnly}
                  onAdd={(files) => onAttach(test, files)}
                  onLoad={onLoadAttachment}
                  onRemove={(attachment) => onDetach(test, attachment)}
                  subject={`${test.id}: ${test.title}`}
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
