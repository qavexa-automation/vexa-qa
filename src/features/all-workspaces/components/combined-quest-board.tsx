import { useMemo, useState, type Ref } from "react";
import { LayoutDashboard, ListTodo, RotateCw, Search, X } from "lucide-react";

import { ResourceEmpty } from "@/components/data-table/resource-empty";
import { FilterCombobox, valueOptions } from "@/components/forms/filter-combobox";
import {
  QuestBoardColumns,
  questBoardKey,
  type QuestTrigger,
} from "@/components/quest-board-columns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { IssueTable } from "@/components/workspace-tables/issue-table";
import { canOpenWorkspaceView } from "@/features/workspace-access";
import { PRIORITIES, TYPES, type Priority, type Status } from "@/lib/model";
import { matchesSearch } from "@/lib/search-params";
import { supabase } from "@/lib/supabase";

import { useAllWorkspaces } from "../hooks/use-all-workspaces";
import { saveRecordEdit } from "../lib/save-record-edit";
import { questChange, workspaceQuests } from "../lib/workspace-quests";
import { RecordDetails } from "./record-details";
import { WorkspaceInlineStatus } from "./workspace-inline-status";
import { WorkspaceRecordsContext } from "./workspace-record-context";

export function CombinedQuestBoard({
  userId,
  searchInput,
  canAdd,
  matchesAssignee,
  onAdd,
  onNotice,
}: {
  userId: string;
  searchInput: Ref<HTMLInputElement>;
  canAdd: boolean;
  matchesAssignee: (name: string) => boolean;
  onAdd: (status: Status, project: string) => void;
  onNotice: (notice: string) => void;
}) {
  const { sources, loading, refreshing, error, refresh } = useAllWorkspaces(userId);
  const [listMode, setListMode] = useState(false);
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");
  const [project, setProject] = useState("");
  const [mine, setMine] = useState(false);
  const [actionError, setActionError] = useState("");
  const entries = useMemo(() => workspaceQuests(sources), [sources]);
  const entryByKey = useMemo(
    () => new Map(entries.map((entry) => [questBoardKey(entry.issue), entry])),
    [entries],
  );
  const context = useMemo(
    () => ({
      userId,
      refresh,
      sources: new Map(sources.map((source) => [source.owner, source])),
    }),
    [userId, refresh, sources],
  );
  const projects = useMemo(
    () =>
      [
        ...new Set(
          [
            ...entries.map((entry) => entry.project),
            ...sources
              .filter((source) => canOpenWorkspaceView(source.role, "Quest board"))
              .flatMap((source) => (source.workspace.projects ?? []).map(({ name }) => name)),
          ].filter(Boolean),
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [entries, sources],
  );
  const projectFilter = projects.includes(project) ? project : "";
  const issues = entries
    .filter(
      ({ issue, project }) =>
        (!priority || issue.priority === priority) &&
        (!type || issue.type === type) &&
        (!projectFilter || project === projectFilter) &&
        (!mine || matchesAssignee(issue.assignee)) &&
        matchesSearch(search, [
          issue.id,
          issue.title,
          issue.description,
          issue.assignee,
          issue.workspace,
          ...issue.labels,
        ]),
    )
    .map(({ issue }) => issue);
  const hasFilters = !!(search.trim() || priority || type || projectFilter || mine);
  const completed = entries.filter(({ issue }) => issue.status === "Completed").length;

  function clearFilters() {
    setSearch("");
    setPriority("");
    setType("");
    setProject("");
    setMine(false);
  }

  const renderTrigger: QuestTrigger = (issue, trigger) => {
    const record = entryByKey.get(questBoardKey(issue))?.record;
    return record ? <RecordDetails record={record} trigger={trigger} /> : trigger;
  };

  async function save(key: string, change: { status: Status } | { priority: Priority }) {
    const entry = entryByKey.get(key);
    const source = entry && context.sources.get(entry.record.owner);
    if (!entry || !source || !supabase) return;
    setActionError("");
    try {
      const draft = questChange(source, entry.record, change);
      await saveRecordEdit(supabase, userId, source, draft);
      refresh();
      onNotice(
        "status" in change
          ? `${entry.issue.id} moved to ${change.status}`
          : `${entry.issue.id} priority set to ${change.priority}`,
      );
    } catch (problem) {
      setActionError(
        problem instanceof Error ? problem.message : "Unable to save the quest. Try again.",
      );
      refresh();
    }
  }

  if (loading)
    return (
      <div className="space-y-4" role="status">
        <span className="sr-only">Loading Quest Board</span>
        <Skeleton className="h-9 w-full sm:w-80" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-44 rounded-xl" />
          ))}
        </div>
      </div>
    );

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="h-9 w-full sm:max-w-xs">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search quests"
            placeholder="Search quests…"
            ref={searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </InputGroup>
        <FilterCombobox
          allLabel="All priorities"
          label="Filter by priority"
          options={valueOptions(PRIORITIES)}
          value={priority}
          onChange={setPriority}
        />
        <FilterCombobox
          allLabel="All types"
          label="Filter by type"
          options={valueOptions(TYPES)}
          value={type}
          onChange={setType}
        />
        <FilterCombobox
          allLabel="All project titles"
          label="Filter by project title"
          options={valueOptions(projects)}
          value={projectFilter}
          onChange={setProject}
        />
        <Button
          aria-pressed={mine}
          variant={mine ? "secondary" : "outline"}
          onClick={() => setMine(!mine)}
        >
          Assigned to me
        </Button>
        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            <X aria-hidden="true" />
            Clear filters
          </Button>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button aria-disabled={refreshing} variant="outline" onClick={refresh}>
            <RotateCw aria-hidden="true" />
            Refresh
          </Button>
          <Button
            aria-label="Board view"
            aria-pressed={!listMode}
            variant={!listMode ? "secondary" : "outline"}
            size="icon"
            onClick={() => setListMode(false)}
          >
            <LayoutDashboard aria-hidden="true" />
          </Button>
          <Button
            aria-label="List view"
            aria-pressed={listMode}
            variant={listMode ? "secondary" : "outline"}
            size="icon"
            onClick={() => setListMode(true)}
          >
            <ListTodo aria-hidden="true" />
          </Button>
        </div>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error} Select Refresh to try again.</AlertDescription>
        </Alert>
      )}
      {actionError && (
        <Alert variant="destructive">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}
      {(sources.length > 0 || !error) && (
        <WorkspaceRecordsContext.Provider value={context}>
          <p className="text-sm text-muted-foreground">
            {completed} completed · {entries.length - completed} to go
          </p>
          {listMode ? (
            issues.length ? (
              <IssueTable
                issues={issues}
                showWorkspace
                renderTrigger={renderTrigger}
                onPriorityChange={(key, priority) => void save(key, { priority })}
                onStatusChange={(key, status) => void save(key, { status })}
              />
            ) : (
              <ResourceEmpty
                icon={<LayoutDashboard />}
                title="No quests found"
                description="Create a quest or adjust your filters."
              />
            )
          ) : (
            <QuestBoardColumns
              issues={issues}
              canAdd={canAdd}
              renderTrigger={renderTrigger}
              renderStatus={(issue) => {
                const record = entryByKey.get(questBoardKey(issue))?.record;
                return record && <WorkspaceInlineStatus record={record} />;
              }}
              onAdd={(status) => onAdd(status, projectFilter)}
              onMove={(key, status) => void save(key, { status })}
            />
          )}
        </WorkspaceRecordsContext.Provider>
      )}
    </div>
  );
}
