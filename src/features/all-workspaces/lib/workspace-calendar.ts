import type { CalendarEvent } from "@/features/activity-calendar";
import { canOpenWorkspaceView } from "@/features/workspace-access";

import type { WorkspaceSource } from "./workspace-records";

export function calendarEdit(
  source: WorkspaceSource,
  original: CalendarEvent | null,
  next: CalendarEvent | null,
) {
  if (!canOpenWorkspaceView(source.role, "Activity Calendar"))
    throw new Error("Editor access is required to change the team calendar.");
  const current = source.workspace.calendarEvents ?? [];
  if (original && !current.some((event) => event.id === original.id))
    throw new Error("This activity is no longer available.");
  if (
    next?.projectId &&
    next.projectId !== original?.projectId &&
    !source.workspace.projects?.some((project) => project.id === next.projectId)
  )
    throw new Error("Select a project from this calendar’s workspace.");

  // Compare against the activity as it was when the form opened, even after a refresh.
  const base = original
    ? current.map((event) => (event.id === original.id ? original : event))
    : current;
  let calendarEvents = base;
  if (original)
    calendarEvents = next
      ? base.map((event) => (event.id === original.id ? { ...next, id: original.id } : event))
      : base.filter((event) => event.id !== original.id);
  else if (next && !base.some((event) => event.id === next.id)) calendarEvents = [...base, next];

  return {
    source: { ...source, workspace: { ...source.workspace, calendarEvents: base } },
    draft: { ...source.workspace, calendarEvents },
  };
}
