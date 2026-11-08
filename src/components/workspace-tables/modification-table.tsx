"use client";

import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { InlineStatusSelect } from "@/components/forms/inline-status-select";
import {
  dateFilter,
  filterDateRange,
  filterOptions,
  filterText,
  optionsFilter,
  textFilter,
} from "@/components/data-table/column-filter";
import { sortByRank } from "@/components/data-table/sort-by-rank";
import { toModificationDate } from "@/lib/modifications";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import { editDeleteActions, RowActions } from "@/components/data-table/row-actions";
import { useClientTable } from "@/components/data-table/use-client-table";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DateCell,
  LongTextCell,
  PersonCell,
  RecordTile,
  TextCell,
} from "@/components/workspace-tables/cells";
import { type Modification, PRIORITIES, STATUSES } from "@/lib/model";
import { priorityRank, priorityTone, statusRank, statusTone } from "@/lib/status-tones";
import { AttachmentCell, type Attachment } from "@/features/attachments";

const columnHelper = createColumnHelper<DataTableFeatures, Modification>();
const ATTACHMENT_PRESENCE = ["Attached", "None"] as const;

export function ModificationTable({
  modifications,
  onEdit,
  onDelete,
  onUpdate,
  onAttach,
  onDetach,
  onLoadAttachment,
  uploadingId,
  canAttach,
}: {
  modifications: Modification[];
  onEdit: (modification: Modification) => void;
  onDelete: (modification: Modification) => void;
  /** Saves an inline change, such as a new priority or status. */
  onUpdate: (modification: Modification) => void;
  /** Compresses and uploads dropped, pasted, or browsed files. */
  onAttach: (modification: Modification, files: File[]) => void;
  onDetach: (modification: Modification, attachment: Attachment) => void;
  onLoadAttachment: (attachment: Attachment) => Promise<Blob>;
  /** The record currently uploading, so only its cell shows progress. */
  uploadingId: string | null;
  /** Attachments need cloud storage; local-only workspaces cannot hold files. */
  canAttach: boolean;
}) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("projectName", {
          filterFn: filterText,
          sortFn: "text",
          meta: { filter: textFilter("Project name"), cellClassName: "font-medium" },
          cell: ({ getValue }) => <TextCell value={getValue()} />,
          header: ({ column }) => <DataTableColumnHeader column={column} title="Project name" />,
        }),
        columnHelper.accessor("module", {
          filterFn: filterText,
          meta: { filter: textFilter("Module") },
          sortFn: "text",
          cell: ({ getValue }) => <TextCell value={getValue()} />,
          header: ({ column }) => <DataTableColumnHeader column={column} title="Module" />,
        }),
        columnHelper.accessor("description", {
          filterFn: filterText,
          meta: { filter: textFilter("Modification") },
          enableSorting: false,
          header: "Modification",
          cell: ({ row }) => <LongTextCell value={row.original.description} />,
        }),
        columnHelper.accessor("developer", {
          filterFn: filterText,
          meta: { filter: textFilter("Developer") },
          sortFn: "text",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Developer" />,
          cell: ({ row }) => <PersonCell name={row.original.developer} />,
        }),
        columnHelper.accessor("notes", {
          filterFn: filterText,
          meta: { filter: textFilter("Remarks") },
          enableSorting: false,
          header: "Remarks",
          cell: ({ row }) => <LongTextCell value={row.original.notes} />,
        }),
        columnHelper.accessor(
          (modification) => toModificationDate(modification.requestedAt) ?? "",
          {
            filterFn: filterDateRange,
            meta: { filter: dateFilter("Date requested") },
            id: "requestedAt",
            sortFn: "text",
            sortDescFirst: true,
            header: ({ column }) => (
              <DataTableColumnHeader column={column} title="Date requested" />
            ),
            cell: ({ row }) => <DateCell value={row.original.requestedAt} />,
          },
        ),
        columnHelper.accessor((modification) => toModificationDate(modification.modifiedAt) ?? "", {
          filterFn: filterDateRange,
          meta: { filter: dateFilter("Date modified") },
          id: "modifiedAt",
          sortFn: "text",
          sortDescFirst: true,
          header: ({ column }) => <DataTableColumnHeader column={column} title="Date modified" />,
          cell: ({ row }) => <DateCell value={row.original.modifiedAt} />,
        }),
        columnHelper.accessor((modification) => modification.priority, {
          filterFn: filterOptions,
          meta: { filter: optionsFilter("Priority", PRIORITIES) },
          id: "priority",
          sortFn: sortByRank(priorityRank),
          header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
          cell: ({ row }) => (
            <InlineStatusSelect
              label={`Priority for ${row.original.projectName}: ${row.original.module}`}
              onChange={(next) => onUpdate({ ...row.original, priority: next })}
              options={PRIORITIES}
              tone={priorityTone}
              value={row.original.priority}
            />
          ),
        }),
        // The column filters and sorts on the human label, so "Attached" / "None" is what the
        // header filter and an export show; the cell itself stays interactive.
        columnHelper.accessor(
          (modification) => (modification.attachments?.length ? "Attached" : "None"),
          {
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
                onAdd={(files) => onAttach(row.original, files)}
                onLoad={onLoadAttachment}
                onRemove={(attachment) => onDetach(row.original, attachment)}
                subject={`${row.original.projectName}: ${row.original.module}`}
              />
            ),
          },
        ),
        columnHelper.accessor((modification) => modification.status, {
          filterFn: filterOptions,
          meta: { filter: optionsFilter("Status", STATUSES) },
          id: "status",
          sortFn: sortByRank(statusRank),
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }) => (
            <InlineStatusSelect
              label={`Status for ${row.original.projectName}: ${row.original.module}`}
              onChange={(next) => onUpdate({ ...row.original, status: next })}
              options={STATUSES}
              tone={statusTone}
              value={row.original.status}
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
              actions={[
                { label: "Edit modification", icon: Pencil, onSelect: () => onEdit(row.original) },
                {
                  label: "Delete modification",
                  icon: Trash2,
                  onSelect: () => onDelete(row.original),
                  destructive: true,
                },
              ]}
              subject={`${row.original.projectName}: ${row.original.module}`}
            />
          ),
        }),
      ]),
    [onEdit, onDelete, onUpdate, onAttach, onDetach, onLoadAttachment, uploadingId, canAttach],
  );
  const table = useClientTable({
    storageKey: "modifications",
    columns,
    data: modifications,
    getRowId: (modification) => modification.id,
  });
  if (!modifications.length) return null;
  return (
    <DataTable
      exportName="Modifications"
      ariaLabel="Modification records"
      renderTile={(modification) => (
        <RecordTile
          action={
            <RowActions
              actions={editDeleteActions(
                "modification",
                () => onEdit(modification),
                () => onDelete(modification),
                { edit: Pencil, delete: Trash2 },
              )}
              subject={`${modification.projectName}: ${modification.module}`}
            />
          }
          meta={[
            {
              label: "Priority",
              value: (
                <InlineStatusSelect
                  label={`Priority for ${modification.projectName}: ${modification.module}`}
                  onChange={(next) => onUpdate({ ...modification, priority: next })}
                  options={PRIORITIES}
                  tone={priorityTone}
                  value={modification.priority}
                />
              ),
            },
            { label: "Developer", value: modification.developer || "—" },
            {
              label: "Attachments",
              value: (
                <AttachmentCell
                  attachments={modification.attachments ?? []}
                  busy={uploadingId === modification.id}
                  disabled={!canAttach}
                  onAdd={(files) => onAttach(modification, files)}
                  onLoad={onLoadAttachment}
                  onRemove={(attachment) => onDetach(modification, attachment)}
                  subject={`${modification.projectName}: ${modification.module}`}
                />
              ),
            },
            { label: "Requested", value: <DateCell value={modification.requestedAt} /> },
            { label: "Modified", value: <DateCell value={modification.modifiedAt} /> },
          ]}
          status={
            <InlineStatusSelect
              label={`Status for ${modification.projectName}: ${modification.module}`}
              onChange={(next) => onUpdate({ ...modification, status: next })}
              options={STATUSES}
              tone={statusTone}
              value={modification.status}
            />
          }
          subtitle={modification.projectName}
          title={modification.module}
        />
      )}
      table={table}
    />
  );
}
