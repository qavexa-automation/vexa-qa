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
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import { editDeleteActions, RowActions } from "@/components/data-table/row-actions";
import { useClientTable } from "@/components/data-table/use-client-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { LongTextCell, RecordTile, TextCell } from "@/components/workspace-tables/cells";
import { type Deployment, DEPLOYMENT_ENVIRONMENTS, DEPLOYMENT_STATUSES } from "@/lib/model";
import { deploymentStatusRank, deploymentStatusTone } from "@/lib/status-tones";

const columnHelper = createColumnHelper<DataTableFeatures, Deployment>();

export function DeploymentTable({
  deployments,
  onEdit,
  onDelete,
  onUpdate,
}: {
  deployments: Deployment[];
  onEdit: (deployment: Deployment) => void;
  onDelete: (deployment: Deployment) => void;
  /** Saves an inline change, such as a new status. */
  onUpdate: (deployment: Deployment) => void;
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
        columnHelper.accessor("environment", {
          filterFn: filterOptions,
          meta: { filter: optionsFilter("Environment", DEPLOYMENT_ENVIRONMENTS) },
          sortFn: "text",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Environment" />,
        }),
        columnHelper.accessor("version", {
          filterFn: filterText,
          sortFn: "alphanumeric",
          meta: { filter: textFilter("Version / Release"), cellClassName: "font-mono text-xs" },
          cell: ({ getValue }) => <TextCell value={getValue()} />,
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Version / Release" />
          ),
        }),
        // Stored as YYYY-MM-DD, so text order is date order.
        columnHelper.accessor("deploymentDate", {
          filterFn: filterDateRange,
          sortFn: "text",
          sortDescFirst: true,
          meta: {
            filter: dateFilter("Deployment date"),
            cellClassName: "whitespace-nowrap tabular-nums",
          },
          header: ({ column }) => <DataTableColumnHeader column={column} title="Deployment date" />,
        }),
        columnHelper.accessor((deployment) => deployment.status, {
          filterFn: filterOptions,
          meta: { filter: optionsFilter("Status", DEPLOYMENT_STATUSES) },
          id: "status",
          sortFn: sortByRank(deploymentStatusRank),
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row }) => (
            <InlineStatusSelect
              label={`Status for deployment ${row.original.version} of ${row.original.projectName}`}
              onChange={(next) => onUpdate({ ...row.original, status: next })}
              options={DEPLOYMENT_STATUSES}
              tone={deploymentStatusTone}
              value={row.original.status}
            />
          ),
        }),
        columnHelper.accessor("notes", {
          filterFn: filterText,
          meta: { filter: textFilter("Notes") },
          enableSorting: false,
          header: "Notes",
          cell: ({ row }) => <LongTextCell value={row.original.notes} />,
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
                { label: "Edit deployment", icon: Pencil, onSelect: () => onEdit(row.original) },
                {
                  label: "Delete deployment",
                  icon: Trash2,
                  onSelect: () => onDelete(row.original),
                  destructive: true,
                },
              ]}
              subject={`${row.original.version} of ${row.original.projectName}`}
            />
          ),
        }),
      ]),
    [onEdit, onDelete, onUpdate],
  );
  const table = useClientTable({
    storageKey: "deployments",
    columns,
    data: deployments,
    getRowId: (deployment) => deployment.id,
  });
  if (!deployments.length) return null;
  return (
    <DataTable
      exportName="Deployments"
      ariaLabel="Deployments"
      renderTile={(deployment) => (
        <RecordTile
          action={
            <RowActions
              actions={editDeleteActions(
                "deployment",
                () => onEdit(deployment),
                () => onDelete(deployment),
                { edit: Pencil, delete: Trash2 },
              )}
              subject={`${deployment.version} of ${deployment.projectName}`}
            />
          }
          meta={[
            { label: "Environment", value: deployment.environment },
            { label: "Date", value: deployment.deploymentDate },
          ]}
          status={
            <InlineStatusSelect
              label={`Status for deployment ${deployment.version} of ${deployment.projectName}`}
              onChange={(next) => onUpdate({ ...deployment, status: next })}
              options={DEPLOYMENT_STATUSES}
              tone={deploymentStatusTone}
              value={deployment.status}
            />
          }
          subtitle={deployment.version}
          title={deployment.projectName}
        />
      )}
      table={table}
    />
  );
}
