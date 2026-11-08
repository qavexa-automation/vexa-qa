"use client";

import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { BookOpen, Bug, CheckCheck, Zap, type LucideIcon } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { InlineStatusSelect } from "@/components/forms/inline-status-select";
import {
  filterOptions,
  filterText,
  optionsFilter,
  textFilter,
} from "@/components/data-table/column-filter";
import { sortByRank } from "@/components/data-table/sort-by-rank";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { DataTableFeatures } from "@/components/data-table/data-table-features";
import { useClientTable } from "@/components/data-table/use-client-table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { PersonCell, RecordTile } from "@/components/workspace-tables/cells";
import { type Issue, PRIORITIES, STATUSES, type Priority, type Status } from "@/lib/model";
import { priorityRank, priorityTone, statusRank, statusTone } from "@/lib/status-tones";

const typeIcons: Record<Issue["type"], LucideIcon> = { Bug, Task: CheckCheck, Story: BookOpen };
const columnHelper = createColumnHelper<DataTableFeatures, Issue>();

type IssueHandlers = {
  onOpen: (issue: Issue) => void;
  onStatusChange: (id: string, status: Status) => void;
  onPriorityChange: (id: string, priority: Priority) => void;
};

function issueColumns({ onOpen, onStatusChange, onPriorityChange }: IssueHandlers) {
  return columnHelper.columns([
    columnHelper.accessor("title", {
      filterFn: filterText,
      meta: { filter: textFilter("Quest"), exportId: true },
      sortFn: "text",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Quest" />,
      cell: ({ row }) => {
        const issue = row.original;
        const Icon = typeIcons[issue.type];
        return (
          <button
            className="group flex min-w-56 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => onOpen(issue)}
            type="button"
          >
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-brand-subtle text-brand">
              <Icon aria-label={issue.type} className="size-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block font-mono text-xs text-muted-foreground">{issue.id}</span>
              <span
                className="block max-w-72 truncate font-medium group-hover:underline"
                title={issue.title}
              >
                {issue.title}
              </span>
            </span>
          </button>
        );
      },
    }),
    columnHelper.accessor((issue) => issue.priority, {
      filterFn: filterOptions,
      meta: { filter: optionsFilter("Priority", PRIORITIES) },
      id: "priority",
      sortFn: sortByRank(priorityRank),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
      cell: ({ row }) => (
        <InlineStatusSelect
          label={`Priority for ${row.original.id}`}
          onChange={(next) => onPriorityChange(row.original.id, next)}
          options={PRIORITIES}
          tone={priorityTone}
          value={row.original.priority}
        />
      ),
    }),
    columnHelper.accessor((issue) => issue.status, {
      filterFn: filterOptions,
      meta: { filter: optionsFilter("Status", STATUSES) },
      id: "status",
      sortFn: sortByRank(statusRank),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <InlineStatusSelect
          label={`Status for ${row.original.id}`}
          onChange={(next) => onStatusChange(row.original.id, next)}
          options={STATUSES}
          tone={statusTone}
          value={row.original.status}
        />
      ),
    }),
    columnHelper.accessor("assignee", {
      filterFn: filterText,
      meta: { filter: textFilter("Assignee") },
      sortFn: "text",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Assignee" />,
      cell: ({ row }) => <PersonCell name={row.original.assignee} />,
    }),
    columnHelper.accessor("xp", {
      sortFn: "basic",
      meta: { label: "Reward", headerClassName: "text-right", cellClassName: "text-right" },
      header: ({ column }) => <DataTableColumnHeader align="end" column={column} title="Reward" />,
      cell: ({ row }) => (
        <span className="inline-flex items-center gap-1 font-medium whitespace-nowrap text-status-attention tabular-nums">
          <Zap aria-hidden="true" className="size-3" />
          {row.original.xp} XP
        </span>
      ),
    }),
  ]);
}

/** Quests for the quest board and the dashboard. A limited list keeps its given order. */
export function IssueTable({
  issues,
  limit,
  onOpen,
  onStatusChange,
  onPriorityChange,
}: {
  issues: Issue[];
  limit?: number;
} & IssueHandlers) {
  const columns = useMemo(
    () => issueColumns({ onOpen, onStatusChange, onPriorityChange }),
    [onOpen, onStatusChange, onPriorityChange],
  );
  const data = useMemo(() => issues.slice(0, limit ?? issues.length), [issues, limit]);
  const table = useClientTable({
    storageKey: "quests",
    columns,
    data,
    getRowId: (issue) => issue.id,
    enableSorting: limit === undefined,
  });
  if (!data.length) return null;
  return (
    <DataTable
      exportName="Quests"
      ariaLabel="Quests"
      renderTile={(issue) => (
        <RecordTile
          action={
            <Button
              aria-label={`Open ${issue.id}`}
              size="sm"
              variant="outline"
              onClick={() => onOpen(issue)}
            >
              Open
            </Button>
          }
          meta={[
            {
              label: "Priority",
              value: (
                <InlineStatusSelect
                  label={`Priority for ${issue.id}`}
                  onChange={(next) => onPriorityChange(issue.id, next)}
                  options={PRIORITIES}
                  tone={priorityTone}
                  value={issue.priority}
                />
              ),
            },
            { label: "Assignee", value: <PersonCell name={issue.assignee} /> },
            { label: "Type", value: issue.type },
            { label: "Reward", value: `${issue.xp} XP` },
          ]}
          status={
            <InlineStatusSelect
              label={`Status for ${issue.id}`}
              onChange={(next) => onStatusChange(issue.id, next)}
              options={STATUSES}
              tone={statusTone}
              value={issue.status}
            />
          }
          subtitle={issue.id}
          title={issue.title}
        />
      )}
      table={table}
    />
  );
}
