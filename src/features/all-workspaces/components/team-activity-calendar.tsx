import { useEffect, useState, type Ref } from "react";
import { RotateCw, Search } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityCalendarScreen, type CalendarEvent } from "@/features/activity-calendar";
import { canOpenWorkspaceView } from "@/features/workspace-access";
import { supabase } from "@/lib/supabase";

import { useAllWorkspaces } from "../hooks/use-all-workspaces";
import { saveRecordEdit } from "../lib/save-record-edit";
import { calendarEdit } from "../lib/workspace-calendar";

export function TeamActivityCalendar({
  userId,
  searchInput,
  onNotice,
  onManageProjects,
}: {
  userId: string;
  searchInput: Ref<HTMLInputElement>;
  onNotice: (notice: string) => void;
  onManageProjects: () => void;
}) {
  const { sources, loading, refreshing, error, refresh } = useAllWorkspaces(
    userId,
    "team-calendar",
  );
  const [search, setSearch] = useState("");
  const source = sources[0];
  const owner = source?.owner;
  const canAccess = source && canOpenWorkspaceView(source.role, "Activity Calendar");

  useEffect(() => {
    const client = supabase;
    if (!client || !owner) return;
    let active = true;
    const channel = client
      .channel(`qa-team-calendar-${owner}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "qa_workspaces", filter: `user_id=eq.${owner}` },
        refresh,
      )
      .subscribe((status) => {
        if (active && status === "SUBSCRIBED") refresh();
      });
    return () => {
      active = false;
      void client.removeChannel(channel);
    };
  }, [owner, refresh]);

  async function save(original: CalendarEvent | null, next: CalendarEvent | null) {
    if (!supabase || !source)
      throw new Error("The team calendar is unavailable. Refresh and try again.");
    const edit = calendarEdit(source, original, next);
    await saveRecordEdit(supabase, userId, edit.source, edit.draft);
    refresh();
  }

  if (loading)
    return (
      <div className="space-y-5" role="status">
        <span className="sr-only">Loading team calendar</span>
        <Skeleton className="h-9 w-full sm:w-80" />
        <Skeleton className="h-105 w-full rounded-xl" />
      </div>
    );

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="h-9 w-full sm:max-w-xs">
          <InputGroupAddon>
            <Search aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search activities"
            placeholder="Search activities…"
            ref={searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </InputGroup>
        {source && (
          <span className="text-sm font-medium text-muted-foreground">{source.label}</span>
        )}
        <Button className="ml-auto" aria-disabled={refreshing} onClick={refresh} variant="outline">
          <RotateCw aria-hidden="true" /> Refresh
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error} Select Refresh to try again.</AlertDescription>
        </Alert>
      )}
      {source && !canAccess && (
        <Alert>
          <AlertDescription>Editor access is required to open this team calendar.</AlertDescription>
        </Alert>
      )}
      {source && canAccess && (
        <ActivityCalendarScreen
          key={source.owner}
          events={source.workspace.calendarEvents ?? []}
          projects={source.workspace.projects ?? []}
          search={search}
          workspaceLabel={source.label}
          onSave={(activity, original) => save(original, activity)}
          onDelete={(original) => save(original, null)}
          onNotice={onNotice}
          onManageProjects={onManageProjects}
        />
      )}
    </div>
  );
}
