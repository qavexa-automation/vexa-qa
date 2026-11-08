import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dateLabel, eventsOnDate, monthDays } from "../lib/calendar";
import { eventAppearance } from "../lib/event-appearance";
import type { CalendarEvent } from "../types/calendar-event";

export function MonthGrid({ month, selected, today, events, onSelect }: {
  month: string; selected: string; today: string; events: CalendarEvent[]; onSelect: (date: string) => void;
}) {
  const days = monthDays(month);
  return <table className="w-full table-fixed border-collapse" aria-label={dateLabel(`${month}-01`, { day: undefined })}>
    <thead><tr>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) =>
      <th key={day} scope="col" className="border-b border-border py-3 text-center text-xs font-medium text-muted-foreground">{day}</th>
    )}</tr></thead>
    <tbody>{Array.from({ length: 6 }, (_, row) => <tr key={row}>
      {days.slice(row * 7, row * 7 + 7).map((date) => {
        const entries = eventsOnDate(events, date);
        return <td key={date} className="border border-border p-0 align-top first:border-l-0 last:border-r-0">
          <Button variant="ghost" onClick={() => onSelect(date)} aria-pressed={date === selected}
            aria-current={date === today ? "date" : undefined}
            aria-label={`${dateLabel(date, { weekday: "long" })}, ${entries.length} ${entries.length === 1 ? "activity" : "activities"}`}
            className={cn("h-auto min-h-16 w-full min-w-0 flex-col items-stretch justify-start gap-1 rounded-none p-1.5 text-left whitespace-normal sm:min-h-28 sm:p-2 lg:min-h-32",
              !date.startsWith(month) && "text-muted-foreground",
              date === selected && "bg-brand-subtle ring-2 ring-inset ring-brand")}>
            <span className={cn("flex size-7 shrink-0 items-center justify-center self-center rounded-full text-xs font-medium sm:self-start",
              date === today && "bg-brand text-brand-foreground")}>{Number(date.slice(-2))}</span>
            <span className="hidden w-full min-w-0 space-y-1 sm:block" aria-hidden="true">
              {/* The day cell carries the activity title alone, in full; its time and details
                  belong to the day agenda beside the grid. */}
              {entries.slice(0, 2).map((entry) => <span key={entry.id} className={cn("block rounded-sm border-l-2 px-1 py-0.5 text-xs font-normal wrap-anywhere text-foreground", eventAppearance[entry.kind].chip,
                entry.status !== "Scheduled" && "line-through opacity-60")}>
                {entry.title}
              </span>)}
              {entries.length > 2 && <span className="block text-xs text-muted-foreground">+{entries.length - 2} more</span>}
            </span>
            {entries.length > 0 && <span className="flex justify-center gap-0.5 sm:hidden" aria-hidden="true">
              {entries.slice(0, 3).map((entry) => <span key={entry.id} className={cn("size-1.5 rounded-full", eventAppearance[entry.kind].dot)} />)}
            </span>}
          </Button>
        </td>;
      })}
    </tr>)}</tbody>
  </table>;
}
