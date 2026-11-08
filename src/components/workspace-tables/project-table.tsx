"use client";

import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { filterOptions, filterText, optionsFilter, textFilter } from "@/components/data-table/column-filter";
import { sortByRank } from "@/components/data-table/sort-by-rank";
import { InlineStatusSelect } from "@/components/forms/inline-status-select";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import { editDeleteActions, RowActions } from "@/components/data-table/row-actions";
import { useClientTable } from "@/components/data-table/use-client-table";
import { PersonCell, RecordTile, TextCell } from "@/components/workspace-tables/cells";
import { getDepartmentSection, PROJECT_STATUSES, type Project } from "@/lib/model";
import { projectStatusRank, projectStatusTone } from "@/lib/status-tones";

const columnHelper = createColumnHelper<DataTableFeatures, Project>();

export function ProjectTable({
  projects,
  onEdit,
  onDelete,
  onUpdate,
}: {
  projects: Project[];
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  onUpdate: (project: Project) => void;
}) {
  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("name", {
          filterFn: filterText,
          sortFn: "text",
          meta: { filter: textFilter("Project name"), cellClassName: "font-medium" },
          cell: ({ getValue }) => <TextCell value={getValue()} />,
          header: ({ column }) => <DataTableColumnHeader column={column} title="Project name" />,
        }),
        columnHelper.accessor((project) => getDepartmentSection(project), {
          filterFn: filterText,
          id: "department",
          sortFn: "text",
          meta: {
            filter: textFilter("Department/Section"),
            cellClassName: "text-muted-foreground",
          },
          cell: ({ getValue }) => <TextCell value={getValue()} />,
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title="Department/Section" />
          ),
        }),
        columnHelper.accessor("developer", {
          filterFn: filterText,
          meta: { filter: textFilter("Developer") },
          sortFn: "text",
          header: ({ column }) => <DataTableColumnHeader column={column} title="Developer" />,
          cell: ({ row }) => <PersonCell name={row.original.developer} />,
        }),
        columnHelper.accessor((project) => project.status ?? "Not Started", {
          id: "status",
          filterFn: filterOptions,
          meta: { filter: optionsFilter("Status", PROJECT_STATUSES) },
          sortFn: sortByRank(projectStatusRank),
          header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
          cell: ({ row, getValue }) => (
            <InlineStatusSelect
              label={`Status for project ${row.original.name}`}
              value={getValue()}
              options={PROJECT_STATUSES}
              tone={projectStatusTone}
              onChange={(status) => onUpdate({ ...row.original, status })}
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
                { label: "Edit project", icon: Pencil, onSelect: () => onEdit(row.original) },
                {
                  label: "Delete project",
                  icon: Trash2,
                  onSelect: () => onDelete(row.original),
                  destructive: true,
                },
              ]}
              subject={`${row.original.name}`}
            />
          ),
        }),
      ]),
    [onEdit, onDelete, onUpdate],
  );
  const table = useClientTable({
    storageKey: "projects",
    columns,
    data: projects,
    getRowId: (project) => project.id,
  });
  if (!projects.length) return null;
  return (
    <DataTable
      exportName="Projects"
      ariaLabel="Projects"
      renderTile={(project) => (
        <RecordTile
          action={
            <RowActions
              actions={editDeleteActions(
                "project",
                () => onEdit(project),
                () => onDelete(project),
                { edit: Pencil, delete: Trash2 },
              )}
              subject={`${project.name}`}
            />
          }
          meta={[
            { label: "Department/Section", value: getDepartmentSection(project) },
            { label: "Developer", value: project.developer || "—" },
          ]}
          title={project.name}
          subtitle={
            <InlineStatusSelect
              label={`Status for project ${project.name}`}
              className="font-sans"
              value={project.status ?? "Not Started"}
              options={PROJECT_STATUSES}
              tone={projectStatusTone}
              onChange={(status) => onUpdate({ ...project, status })}
            />
          }
        />
      )}
      table={table}
    />
  );
}
