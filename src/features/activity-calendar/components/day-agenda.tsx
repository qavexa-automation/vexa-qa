import { CalendarDays, Check, MapPin, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { IconButton } from "@/components/app-shell/icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/model";
import { dateLabel, eventTime } from "../lib/calendar";
import { eventAppearance } from "../lib/event-appearance";
import type { CalendarEvent } from "../types/calendar-event";

export function DayAgenda({ date, events, projects, onAdd, onEdit, onSave, onDelete }: {
  date: string; events: CalendarEvent[]; projects: Project[];
  onAdd: () => void; onEdit: (event: CalendarEvent) => void;
  onSave: (event: CalendarEvent) => void; onDelete: (event: CalendarEvent) => void;
}) {
  return <section className="min-w-0 rounded-xl border border-border bg-card p-5 text-card-foreground" aria-labelledby="day-agenda-title">
    <div className="mb-5 flex items-start justify-between gap-2">
      <div><p className="mb-1 text-xs font-medium tracking-wide text-muted-foreground">DAILY AGENDA</p>
        <h2 id="day-agenda-title" className="font-sans text-lg font-semibold">{dateLabel(date, { year: undefined })}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{dateLabel(date, { weekday: "long", month: undefined, day: undefined, year: undefined })} · Manila time</p>
      </div>
      <IconButton label="Add activity on this day" icon={Plus} onClick={onAdd} className="size-9" />
    </div>
    <p className="sr-only" role="status">{events.length} activities for {dateLabel(date)}</p>
    {!events.length ? <div className="flex flex-col items-center gap-3 py-10 text-center">
      <CalendarDays className="size-8 text-muted-foreground" aria-hidden="true" />
      <h3 className="font-sans text-sm font-medium">No activities for this day</h3>
      <p className="text-sm text-muted-foreground">Plan a meeting, a test session, or your next QA task.</p>
      <Button variant="outline" onClick={onAdd}><Plus aria-hidden="true" />Add activity</Button>
    </div> : <ul className="space-y-4">{events.map((event) => {
      const project = projects.find((entry) => entry.id === event.projectId);
      return <li key={event.id} className={cn("min-w-0 rounded-lg border border-border border-l-3 p-3", eventAppearance[event.kind].chip)}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground"><span>{event.kind}</span><span>{event.status}</span></div>
        <h3 className={cn("mt-2 font-sans text-sm font-semibold wrap-anywhere", event.status !== "Scheduled" && "line-through")}>
          <Button variant="link" className="h-auto max-w-full justify-start p-0 text-left text-foreground whitespace-normal" onClick={() => onEdit(event)}>{event.title}</Button>
        </h3>
        <p className="mt-2 text-xs text-muted-foreground">{eventTime(event)}</p>
        {event.startDate !== event.endDate && <p className="mt-1 text-xs text-muted-foreground">{dateLabel(event.startDate, { year: undefined })} – {dateLabel(event.endDate, { year: undefined })}</p>}
        {project && <p className="mt-2 text-xs wrap-anywhere">{project.name}</p>}
        {event.location && <p className="mt-2 flex items-start gap-1 text-xs wrap-anywhere"><MapPin className="size-3 shrink-0" aria-hidden="true" />{event.location}</p>}
        {event.notes && <p className="mt-2 line-clamp-3 text-xs whitespace-pre-wrap wrap-anywhere" title={event.notes}>{event.notes}</p>}
        <div className="mt-3 flex items-center justify-end gap-1 border-t border-border/60 pt-2">
          <IconButton label={event.status === "Completed" ? "Mark scheduled" : "Mark completed"} ariaLabel={`${event.status === "Completed" ? "Mark scheduled" : "Mark completed"}: ${event.title}`}
            icon={event.status === "Completed" ? RotateCcw : Check} onClick={() => onSave({ ...event, status: event.status === "Completed" ? "Scheduled" : "Completed" })} className="size-9" />
          <IconButton label="Edit activity" ariaLabel={`Edit activity: ${event.title}`} icon={Pencil} onClick={() => onEdit(event)} className="size-9" />
          <IconButton label="Delete activity" ariaLabel={`Delete activity: ${event.title}`} icon={Trash2} destructive onClick={() => onDelete(event)} className="size-9" />
        </div>
      </li>;
    })}</ul>}
  </section>;
}
