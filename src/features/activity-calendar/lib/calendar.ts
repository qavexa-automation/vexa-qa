import type { CalendarEvent, CalendarEventInput } from "../types/calendar-event";

export const CALENDAR_TIME_ZONE = "Asia/Manila";

export function manilaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function dateLabel(date: string, options: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC", month: "long", day: "numeric", year: "numeric", ...options,
  }).format(new Date(`${date}T12:00:00Z`));
}

export function addDays(date: string, amount: number): string {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + amount);
  return result.toISOString().slice(0, 10);
}

export function shiftMonth(month: string, amount: number): string {
  const result = new Date(`${month}-01T12:00:00Z`);
  result.setUTCMonth(result.getUTCMonth() + amount);
  return result.toISOString().slice(0, 7);
}

export function monthDays(month: string): string[] {
  const first = `${month}-01`;
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
  const start = addDays(first, -weekday);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function eventsOnDate(events: CalendarEvent[], date: string): CalendarEvent[] {
  return events.filter((event) => event.startDate <= date && event.endDate >= date)
    .sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.startDate.localeCompare(b.startDate)
      || a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title));
}

export function eventTime(event: CalendarEvent): string {
  if (event.allDay) return "All day";
  const format = (value: string) => new Intl.DateTimeFormat("en-PH", {
    timeZone: "UTC", hour: "numeric", minute: "2-digit",
  }).format(new Date(`2000-01-01T${value}:00Z`));
  return `${format(event.startTime)} – ${format(event.endTime)}`;
}

export type CalendarFilters = {
  kind: string;
  status: string;
  projectId: string;
  query: string;
};

/**
 * Narrows the calendar to the activities a person asked to see. An empty filter means "all", and
 * the free-text query matches the activity's own words plus its project's name.
 */
export function filterEvents(
  events: CalendarEvent[],
  projects: { id: string; name: string }[],
  { kind, status, projectId, query }: CalendarFilters,
): CalendarEvent[] {
  const search = query.trim().toLowerCase();
  const projectName = (id: string) => projects.find((entry) => entry.id === id)?.name ?? "";
  return events.filter(
    (event) =>
      (!kind || event.kind === kind) &&
      (!status || event.status === status) &&
      (!projectId || event.projectId === projectId) &&
      (!search ||
        [
          event.title,
          event.kind,
          event.status,
          event.location,
          event.notes,
          projectName(event.projectId),
        ]
          .join(" ")
          .toLowerCase()
          .includes(search)),
  );
}

/** The activities overlapping a `YYYY-MM` month, including ones that only span through it. */
export function eventsInMonth(events: CalendarEvent[], month: string): CalendarEvent[] {
  return events.filter(
    (event) => event.startDate.slice(0, 7) <= month && event.endDate.slice(0, 7) >= month,
  );
}

export function blankEvent(date: string): CalendarEventInput {
  return {
    title: "", kind: "Meeting", status: "Scheduled", startDate: date, endDate: date,
    allDay: false, startTime: "09:00", endTime: "10:00", projectId: "", location: "", notes: "",
  };
}
