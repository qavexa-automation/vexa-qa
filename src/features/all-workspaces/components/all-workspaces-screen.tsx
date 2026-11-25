import { useMemo, useState, type Ref } from "react";
import { Layers, RotateCw, Search } from "lucide-react";

import { DataTable } from "@/components/data-table/data-table";
import { ResourceEmpty } from "@/components/data-table/resource-empty";
import { useClientTable } from "@/components/data-table/use-client-table";
import { FilterCombobox, valueOptions } from "@/components/forms/filter-combobox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { RecordTile } from "@/components/workspace-tables/cells";
import { TEST_STATUSES } from "@/lib/model";
import { matchesSearch } from "@/lib/search-params";

import { useAllWorkspaces } from "../hooks/use-all-workspaces";
import {
  recordTypes,
  workspaceRecords,
  type RecordType,
  type WorkspaceRecord,
} from "../lib/workspace-records";
import { RecordDetails } from "./record-details";
import { WorkspaceInlineStatus } from "./workspace-inline-status";
import { WorkspaceRecordActions } from "./workspace-record-actions";
import { workspaceRecordColumns } from "./workspace-record-columns";
import { WorkspaceRecordsContext } from "./workspace-record-context";

export function AllWorkspacesScreen({
  userId,
  searchInput,
  moduleRecordType,
}: {
  userId: string;
  searchInput: Ref<HTMLInputElement>;
  moduleRecordType?: RecordType;
}) {
  const { sources, loading, refreshing, error, refresh } = useAllWorkspaces(userId);
  const [recordType, setRecordType] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const isTestLab = moduleRecordType === "Test case";
  const ariaLabel = isTestLab
    ? "Test cases across workspaces"
    : moduleRecordType
      ? `${moduleRecordType} records across workspaces`
      : "Workspace records";
  const records = useMemo(
    () => sources.flatMap((source) => workspaceRecords(source, moduleRecordType)),
    [sources, moduleRecordType],
  );
  const workspaceFilter = sources.some((source) => source.owner === selectedWorkspace)
    ? selectedWorkspace
    : "";
  const scopedRecords = useMemo(
    () =>
      workspaceFilter ? records.filter((record) => record.owner === workspaceFilter) : records,
    [records, workspaceFilter],
  );
  const projectNames = useMemo(
    () =>
      [...new Set(scopedRecords.map((record) => record.project).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [scopedRecords],
  );
  const projectFilter = projectNames.includes(selectedProject) ? selectedProject : "";
  const recordContext = useMemo(
    () => ({
      userId,
      sources: new Map(sources.map((source) => [source.owner, source])),
      refresh,
    }),
    [userId, sources, refresh],
  );
  const data = useMemo(
    () =>
      scopedRecords.filter(
        (record) =>
          (!recordType || record.type === recordType) &&
          (!projectFilter || record.project === projectFilter) &&
          (!status || record.status.label === status) &&
          matchesSearch(search, [
            record.name,
            record.workspace,
            record.type,
            record.project,
            record.module,
            record.status.label,
            ...record.fields.map(({ value }) => value),
          ]),
      ),
    [scopedRecords, recordType, projectFilter, status, search],
  );
  const columns = useMemo(() => workspaceRecordColumns(moduleRecordType), [moduleRecordType]);
  const table = useClientTable({
    columns,
    data,
    getRowId: (record) => record.key,
    storageKey: moduleRecordType ? `all-workspaces:${moduleRecordType}` : "all-workspaces",
  });
  const hasFilters = !!(search.trim() || recordType || workspaceFilter || projectFilter || status);

  if (loading) {
    return (
      <div className="space-y-3" role="status">
        <span className="sr-only">Loading all workspaces</span>
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <section aria-label={ariaLabel} className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="h-9 w-full sm:max-w-xs">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search all workspaces"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search all workspaces…"
            ref={searchInput}
            value={search}
          />
        </InputGroup>
        {moduleRecordType ? (
          <FilterCombobox
            allLabel="All sources"
            label="Filter by source workspace"
            onChange={(owner) => {
              setSelectedWorkspace(owner);
              setSelectedProject("");
            }}
            options={sources.map(({ owner, label }) => ({ value: owner, label }))}
            value={workspaceFilter}
          />
        ) : (
          <FilterCombobox
            allLabel="All record types"
            label="Filter by record type"
            onChange={setRecordType}
            options={valueOptions(recordTypes)}
            value={recordType}
          />
        )}
        {isTestLab && (
          <>
            <FilterCombobox
              allLabel="All projects"
              label="Filter test cases by project"
              options={valueOptions(projectNames)}
              value={projectFilter}
              onChange={setSelectedProject}
            />
            <FilterCombobox
              allLabel="All statuses"
              label="Filter test case status"
              options={valueOptions(TEST_STATUSES)}
              value={status}
              onChange={setStatus}
            />
          </>
        )}
        <Button
          aria-disabled={refreshing}
          className="ml-auto"
          onClick={refresh}
          type="button"
          variant="outline"
        >
          <RotateCw aria-hidden="true" />
          Refresh
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error} Select Refresh to try again.</AlertDescription>
        </Alert>
      )}
      {(sources.length > 0 || !error) && (
        <WorkspaceRecordsContext.Provider value={recordContext}>
          <DataTable
            ariaLabel={ariaLabel}
            exportName={moduleRecordType && ariaLabel}
            empty={
              <ResourceEmpty
                icon={<Layers />}
                title={
                  hasFilters
                    ? "No matching records"
                    : isTestLab
                      ? "No test cases yet"
                      : "No workspace records yet"
                }
                description={
                  hasFilters
                    ? "Try a different search or filter."
                    : "Saved records from your workspaces will appear here."
                }
                action={
                  hasFilters && (
                    <Button
                      onClick={() => {
                        setSearch("");
                        setRecordType("");
                        setSelectedWorkspace("");
                        setSelectedProject("");
                        setStatus("");
                      }}
                      type="button"
                      variant="outline"
                    >
                      Clear filters
                    </Button>
                  )
                }
              />
            }
            renderTile={(record) => (
              <RecordTile
                action={<WorkspaceRecordActions record={record} />}
                meta={[
                  { label: "Workspace", value: record.workspace },
                  { label: "Project", value: record.project || "—" },
                  ...(record.module ? [{ label: "Module", value: record.module }] : []),
                ]}
                status={<WorkspaceInlineStatus record={record} />}
                subtitle={moduleRecordType ? undefined : record.type}
                title={
                  <RecordDetails
                    record={record}
                    showId={isTestLab || moduleRecordType === "Quest"}
                  />
                }
              />
            )}
            table={table}
          />
        </WorkspaceRecordsContext.Provider>
      )}
    </section>
  );
}
