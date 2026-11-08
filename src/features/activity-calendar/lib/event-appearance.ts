import type { CalendarEvent } from "../types/calendar-event";

export const eventAppearance: Record<CalendarEvent["kind"], { dot: string; chip: string }> = {
  Meeting: { dot: "bg-event-blue", chip: "border-event-blue bg-event-blue-subtle" },
  Task: { dot: "bg-event-teal", chip: "border-event-teal bg-event-teal-subtle" },
  Testing: { dot: "bg-event-violet", chip: "border-event-violet bg-event-violet-subtle" },
  Release: { dot: "bg-event-amber", chip: "border-event-amber bg-event-amber-subtle" },
  Other: { dot: "bg-event-sky", chip: "border-event-sky bg-event-sky-subtle" },
};
