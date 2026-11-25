"use client";

import { useMemo } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import { BookOpen, Bug, CheckCheck, Zap, type LucideIcon } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { InlineStatusSelect } from "@/components/forms/inline-status-select";
import {
  questBoardKey,
  type QuestBoardIssue,
  type QuestTrigger,
} from "@/components/quest-board-columns";
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
import { PersonCell, RecordTile, TextCell } from "@/components/workspace-tables/cells";
import { type Issue, PRIORITIES, STATUSES, type Priority, type Status } from "@/lib/model";
import { priorityRank, priorityTone, statusRank, statusTone } from "@/lib/status-tones";

const typeIcons: Record<Issue["type"], LucideIcon> = { Bug, Task: CheckCheck, Story: BookOpen };
const columnHelper = createColumnHelper<DataTableFeatures, QuestBoardIssue>();

type IssueHandlers = {
  onOpen?: (issue: QuestBoardIssue) => void;
  renderTrigger?: QuestTrigger;
  onStatusChange: (id: string, status: Status) => void;
  onPriorityChange: (id: string, priority: Priority) => void;
};

function issueColumns(
  { onOpen, renderTrigger, onStatusChange, onPriorityChange }: IssueHandlers,
  showWorkspace: boolean,
) {
  return columnHelper.columns([
    columnHelper.accessor("title", {
      filterFn: filterText,
      meta: { filter: textFilter("Quest"), exportId: true },
      sortFn: "text",
      header: ({ column }) => <DataTableColumnHeader column={column} title="Quest" />,
      cell: ({ row }) => {
        const issue = row.original;
        const Icon = typeIcons[issue.type];
        const trigger = (
          <button
            className="group flex min-w-56 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={onOpen ? () => onOpen(issue) : undefined}
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
        return renderTrigger ? renderTrigger(issue, trigger) : trigger;
      },
    }),
    ...(showWorkspace
      ? [
          columnHelper.accessor((issue) => issue.workspace ?? "", {
            id: "workspace",
            filterFn: filterText,
            meta: { filter: textFilter("Workspace") },
            sortFn: "text",
            header: ({ column }) => <DataTableColumnHeader column={column} title="Workspace" />,
            cell: ({ getValue }) => <TextCell value={getValue()} />,
          }),
        ]
      : []),
    columnHelper.accessor((issue) => issue.priority, {
      filterFn: filterOptions,
      meta: { filter: optionsFilter("Priority", PRIORITIES) },
      id: "priority",
      sortFn: sortByRank(priorityRank),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Priority" />,
      cell: ({ row }) => (
        <InlineStatusSelect
          label={`Priority for ${row.original.id}`}
          onChange={(next) => onPriorityChange(questBoardKey(row.original), next)}
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
          onChange={(next) => onStatusChange(questBoardKey(row.original), next)}
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
      filterFn: filterText,
      sortFn: "basic",
      meta: {
        filter: textFilter("Reward"),
        headerClassName: "text-right",
        cellClassName: "text-right",
      },
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
  renderTrigger,
  showWorkspace = false,
}: {
  issues: QuestBoardIssue[];
  limit?: number;
  showWorkspace?: boolean;
} & IssueHandlers) {
  const columns = useMemo(
    () => issueColumns({ onOpen, renderTrigger, onStatusChange, onPriorityChange }, showWorkspace),
    [onOpen, renderTrigger, onStatusChange, onPriorityChange, showWorkspace],
  );
  const data = useMemo(() => issues.slice(0, limit ?? issues.length), [issues, limit]);
  const table = useClientTable({
    storageKey: showWorkspace ? "combined-quests" : "quests",
    columns,
    data,
    getRowId: questBoardKey,
    enableSorting: limit === undefined,
  });
  if (!data.length) return null;
  return (
    <DataTable
      exportName="Quests"
      ariaLabel="Quests"
      renderTile={(issue) => {
        const trigger = (
          <Button
            aria-label={`Open ${issue.id}`}
            size="sm"
            variant="outline"
            onClick={onOpen ? () => onOpen(issue) : undefined}
          >
            Open
          </Button>
        );
        return (
          <RecordTile
            action={renderTrigger ? renderTrigger(issue, trigger) : trigger}
            meta={[
              ...(issue.workspace ? [{ label: "Workspace", value: issue.workspace }] : []),
              {
                label: "Priority",
                value: (
                  <InlineStatusSelect
                    label={`Priority for ${issue.id}`}
                    onChange={(next) => onPriorityChange(questBoardKey(issue), next)}
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
                onChange={(next) => onStatusChange(questBoardKey(issue), next)}
                options={STATUSES}
                tone={statusTone}
                value={issue.status}
              />
            }
            subtitle={issue.id}
            title={issue.title}
          />
        );
      }}
      table={table}
    />
  );
}
