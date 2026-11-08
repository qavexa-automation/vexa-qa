import { describe, expect, it } from "vitest";
import {
  blankEvent,
  eventsInMonth,
  eventsOnDate,
  filterEvents,
  manilaToday,
  monthDays,
  shiftMonth,
} from "./calendar";
import { calendarEventSchema } from "../schemas/calendar-event-schema";
import type { CalendarEvent } from "../types/calendar-event";
import { emptyWorkspace, parseWorkspace } from "@/lib/model";
import { mergeWorkspaces } from "@/lib/workspace-merge";

const event: CalendarEvent = { id: "meeting-1", ...blankEvent("2026-11-07"), title: "Sprint planning" };

describe("QA activity calendar", () => {
  it("uses the Manila date even before midnight UTC", () => {
    expect(manilaToday(new Date("2026-11-06T18:30:00Z"))).toBe("2026-11-07");
  });
  it("builds a Sunday-first six-week month across year and leap-day boundaries", () => {
    expect(monthDays("2026-11")).toHaveLength(42);
    expect(monthDays("2026-11")[0]).toBe("2026-11-01");
    expect(monthDays("2024-02")).toContain("2024-02-29");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
  it("includes multi-day events and orders all-day activities before timed entries", () => {
    const multi = { ...event, id: "test", title: "Regression", startDate: "2026-11-06", endDate: "2026-11-08", allDay: true, startTime: "", endTime: "" };
    expect(eventsOnDate([event, multi], "2026-11-07").map((entry) => entry.id)).toEqual(["test", "meeting-1"]);
    expect(eventsOnDate([event, multi], "2026-11-09")).toEqual([]);
  });
  it("rejects invalid dates, blank titles, unknown kinds, and reversed time ranges", () => {
    for (const change of [{ title: " " }, { startDate: "2026-02-30" }, { kind: "Invalid" }, { endDate: "2026-11-06" }, { endTime: "08:30" }, { endTime: "09:00" }, { startTime: "" }, { startTime: "24:00" }, { allDay: true }]) {
      expect(calendarEventSchema.safeParse({ ...event, ...change }).success).toBe(false);
    }
    expect(calendarEventSchema.safeParse({ ...event, endDate: "2026-11-08", endTime: "08:00" }).success).toBe(true);
    expect(calendarEventSchema.safeParse({ ...event, allDay: true, startTime: "", endTime: "" }).success).toBe(true);
  });
  it("applies each filter independently and searches an activity's project name", () => {
    const projects = [{ id: "project-1", name: "Customer Portal" }];
    const release = {
      ...event, id: "release-1", title: "Ship 2.0", kind: "Release" as const,
      status: "Completed" as const, projectId: "project-1", notes: "Tag the build",
    };
    const all = [event, release];
    const ids = (filters: Parameters<typeof filterEvents>[2]) =>
      filterEvents(all, projects, filters).map((entry) => entry.id);
    const none = { kind: "", status: "", projectId: "", query: "" };
    expect(ids(none)).toEqual(["meeting-1", "release-1"]);
    expect(ids({ ...none, kind: "Release" })).toEqual(["release-1"]);
    expect(ids({ ...none, status: "Scheduled" })).toEqual(["meeting-1"]);
    expect(ids({ ...none, projectId: "project-1" })).toEqual(["release-1"]);
    // The query reaches the linked project's name, not just the activity's own fields.
    expect(ids({ ...none, query: "  CUSTOMER portal " })).toEqual(["release-1"]);
    expect(ids({ ...none, query: "tag the build" })).toEqual(["release-1"]);
    expect(ids({ ...none, query: "planning" })).toEqual(["meeting-1"]);
    expect(ids({ ...none, query: "nothing here" })).toEqual([]);
    // Filters combine, so a contradictory pair matches nothing.
    expect(ids({ ...none, kind: "Release", status: "Scheduled" })).toEqual([]);
  });

  it("counts a multi-month activity in every month it spans", () => {
    const long = { ...event, id: "freeze", startDate: "2026-11-28", endDate: "2027-01-04" };
    for (const month of ["2026-11", "2026-12", "2027-01"]) {
      expect(eventsInMonth([long], month).map((entry) => entry.id)).toEqual(["freeze"]);
    }
    expect(eventsInMonth([long], "2026-10")).toEqual([]);
    expect(eventsInMonth([long], "2027-02")).toEqual([]);
  });

  it("keeps legacy workspaces readable and round-trips calendar entries", () => {
    const legacy = emptyWorkspace();
    delete legacy.calendarEvents;
    expect(parseWorkspace(legacy)).not.toBeNull();
    const workspace = { ...legacy, calendarEvents: [event] };
    expect(parseWorkspace(JSON.parse(JSON.stringify(workspace)))?.calendarEvents).toEqual([event]);
    expect(parseWorkspace({ ...workspace, calendarEvents: [{ ...event, endTime: "08:00" }] })).toBeNull();
  });
  it("merges independent calendar edits and reports conflicting edits or deletion", () => {
    const base = { ...emptyWorkspace(), calendarEvents: [event] };
    const ours = { ...base, calendarEvents: [{ ...event, title: "QA planning" }] };
    const theirs = { ...base, calendarEvents: [{ ...event, location: "Teams" }] };
    expect(mergeWorkspaces(base, ours, theirs).calendarEvents?.[0]).toMatchObject({ title: "QA planning", location: "Teams" });
    expect(() => mergeWorkspaces(base, ours, { ...base, calendarEvents: [] })).toThrow(/Both users changed calendar activity/);
  });
});
