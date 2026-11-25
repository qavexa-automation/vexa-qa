import { describe, expect, it } from "vitest";

import type { CalendarEvent } from "@/features/activity-calendar";
import { emptyWorkspace } from "@/lib/model";

import { calendarEdit } from "./workspace-calendar";
import type { WorkspaceSource } from "./workspace-records";

function source(owner: string, role: WorkspaceSource["role"] = "editor"): WorkspaceSource {
  const event: CalendarEvent = {
    id: "meeting",
    title: `${owner} planning`,
    kind: "Meeting",
    status: "Scheduled",
    startDate: "2026-11-25",
    endDate: "2026-11-25",
    allDay: false,
    startTime: "09:00",
    endTime: "10:30",
    projectId: "portal",
    location: "Meeting room",
    notes: "",
  };
  return {
    owner,
    label: owner,
    role,
    workspace: {
      ...emptyWorkspace(),
      calendarEvents: [event],
      projects: [{ id: "portal", name: "Portal", department: "QA", developer: "Ana" }],
    },
  };
}

describe("Shared team calendar", () => {
  it("requires Editor access to change a team calendar", () => {
    const team = source("QA", "developer");
    expect(() => calendarEdit(team, team.workspace.calendarEvents![0], null)).toThrow(
      /Editor access is required/,
    );
  });

  it("edits and deletes the saved team activity by its original ID", () => {
    const team = source("QA");
    const event = team.workspace.calendarEvents![0];
    const edit = calendarEdit(team, event, { ...event, status: "Completed" });

    expect(edit.source.owner).toBe("QA");
    expect(edit.draft.calendarEvents).toEqual([{ ...event, status: "Completed" }]);
    expect(team.workspace.calendarEvents?.[0].status).toBe("Scheduled");
    expect(calendarEdit(team, event, null).draft.calendarEvents).toEqual([]);
  });

  it("uses the activity version from when editing started after a background refresh", () => {
    const team = source("QA");
    const original = { ...team.workspace.calendarEvents![0] };
    team.workspace.calendarEvents![0].notes = "A teammate changed this.";
    const edit = calendarEdit(team, original, { ...original, notes: "My draft." });

    expect(edit.source.workspace.calendarEvents?.[0].notes).toBe("");
    expect(edit.draft.calendarEvents?.[0].notes).toBe("My draft.");
    expect(team.workspace.calendarEvents?.[0].notes).toBe("A teammate changed this.");
  });

  it("adds to the team, treats retried creation as already saved, and rejects a foreign project", () => {
    const team = source("QA");
    const newEvent = { ...team.workspace.calendarEvents![0], id: "new", title: "New event" };
    const edit = calendarEdit(team, null, newEvent);

    expect(edit.source.owner).toBe("QA");
    expect(edit.draft.calendarEvents?.[1]).toMatchObject({ id: "new", projectId: "portal" });
    expect(
      calendarEdit({ ...team, workspace: edit.draft }, null, newEvent).draft.calendarEvents,
    ).toEqual(edit.draft.calendarEvents);
    expect(() => calendarEdit(team, null, { ...newEvent, projectId: "personal-project" })).toThrow(
      /calendar’s workspace/,
    );
  });
});
