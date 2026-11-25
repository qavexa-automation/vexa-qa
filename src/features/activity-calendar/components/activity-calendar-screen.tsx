"use client";

import { useMemo, useRef, useState } from "react";
import { CalendarPlus, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Panel } from "@/components/app-shell/panel";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { FilterCombobox, valueOptions } from "@/components/forms/filter-combobox";
import { projectOptions } from "@/components/forms/project-options";
import type { Project } from "@/lib/model";
import {
  dateLabel,
  eventsInMonth,
  eventsOnDate,
  filterEvents,
  manilaToday,
  shiftMonth,
} from "../lib/calendar";
import { ACTIVITY_KINDS, ACTIVITY_STATUSES, type CalendarEvent } from "../types/calendar-event";
import { ActivityForm } from "./activity-form";
import { DayAgenda } from "./day-agenda";
import { MonthGrid } from "./month-grid";

/**
 * The Activity Calendar entity: a month grid of QA activities with the selected day's agenda
 * beside it. Dates and times are Asia/Manila wall-clock values throughout.
 */
export function ActivityCalendarScreen({
  events,
  projects,
  search,
  disabled = false,
  onSave,
  onDelete,
  onNotice,
  onManageProjects,
  workspaceLabel,
}: {
  events: CalendarEvent[];
  projects: Project[];
  search: string;
  disabled?: boolean;
  onSave: (event: CalendarEvent, original: CalendarEvent | null) => void | Promise<void>;
  onDelete: (event: CalendarEvent) => void | Promise<void>;
  onNotice: (message: string) => void;
  onManageProjects: () => void;
  workspaceLabel?: string;
}) {
  const today = manilaToday();
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const [kindFilter, setKindFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [form, setForm] = useState<CalendarEvent | "new" | null>(null);
  const [deleting, setDeleting] = useState<CalendarEvent | null>(null);
  const [actionError, setActionError] = useState("");
  const [pending, setPending] = useState(false);
  const mutating = useRef(false);
  const actionsDisabled = disabled || pending;

  // A filter pointing at a deleted project would silently hide everything.
  const activeProjectFilter = projects.some((project) => project.id === projectFilter)
    ? projectFilter
    : "";
  const visible = useMemo(
    () =>
      filterEvents(events, projects, {
        kind: kindFilter,
        status: statusFilter,
        projectId: activeProjectFilter,
        query: search,
      }),
    [events, projects, kindFilter, statusFilter, activeProjectFilter, search],
  );

  const inMonth = eventsInMonth(visible, month).length;
  const filtered = visible.length !== events.length;

  function goToMonth(amount: number) {
    const next = shiftMonth(month, amount);
    setMonth(next);
    // Keep the agenda on a day the grid actually highlights.
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`);
  }

  function goToToday() {
    setMonth(today.slice(0, 7));
    setSelected(today);
  }

  async function mutate(action: () => void | Promise<void>) {
    if (disabled || mutating.current) throw new Error("Wait for the current workspace change to finish.");
    mutating.current = true;
    setActionError("");
    setPending(true);
    try {
      await action();
    } finally {
      mutating.current = false;
      setPending(false);
    }
  }

  async function save(event: CalendarEvent, original: CalendarEvent | null) {
    await mutate(() => onSave(event, original));
    // Follow the activity if it was moved to another day or month.
    if (event.startDate !== original?.startDate) {
      setMonth(event.startDate.slice(0, 7));
      setSelected(event.startDate);
    }
    onNotice(`${event.title} ${original ? "updated" : "added"}`);
  }

  function reportActionError(error: unknown) {
    setActionError(error instanceof Error ? error.message : "Unable to update the activity. Try again.");
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            aria-label="Previous month"
            onClick={() => goToMonth(-1)}
            size="icon"
            variant="outline"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            aria-label="Next month"
            onClick={() => goToMonth(1)}
            size="icon"
            variant="outline"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <h2
          aria-live="polite"
          className="min-w-44 font-heading text-lg font-semibold tracking-tight"
        >
          {dateLabel(`${month}-01`, { day: undefined })}
        </h2>
        <Button onClick={goToToday} variant="outline">
          Today
        </Button>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <Filter aria-hidden="true" className="size-4 text-muted-foreground" />
          <FilterCombobox
            allLabel="All activity types"
            label="Filter activities by type"
            onChange={setKindFilter}
            options={valueOptions(ACTIVITY_KINDS)}
            value={kindFilter}
          />
          <FilterCombobox
            allLabel="All statuses"
            label="Filter activities by status"
            onChange={setStatusFilter}
            options={valueOptions(ACTIVITY_STATUSES)}
            value={statusFilter}
          />
          <FilterCombobox
            allLabel="All projects"
            className="w-52"
            label="Filter activities by project"
            onChange={setProjectFilter}
            options={projectOptions(projects)}
            value={activeProjectFilter}
          />
          <Button disabled={actionsDisabled} onClick={() => setForm("new")}>
            <CalendarPlus aria-hidden="true" />
            Add activity
          </Button>
        </div>
      </div>

      {actionError && <Alert variant="destructive"><AlertDescription>{actionError}</AlertDescription></Alert>}

      {!projects.length && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center gap-2">
            Activities can be linked to a project once you add one.
            <Button className="h-auto p-0" onClick={onManageProjects} variant="link">
              Manage projects
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <Panel
          eyebrow="ACTIVITY CALENDAR"
          title={dateLabel(`${month}-01`, { day: undefined })}
          titleId="activity-month-title"
          action={
            <p className="text-xs text-muted-foreground">
              {inMonth} {inMonth === 1 ? "activity" : "activities"} this month
              {filtered ? " · filtered" : ""}
            </p>
          }
        >
          <MonthGrid
            events={visible}
            month={month}
            onSelect={setSelected}
            selected={selected}
            today={today}
          />
        </Panel>
        <DayAgenda
          date={selected}
          disabled={actionsDisabled}
          events={eventsOnDate(visible, selected)}
          onAdd={() => setForm("new")}
          onDelete={setDeleting}
          onEdit={setForm}
          onSave={(event, original) => void save(event, original).catch(reportActionError)}
          projects={projects}
        />
      </div>

      {form && (
        <ActivityForm
          date={selected}
          disabled={disabled}
          event={form === "new" ? null : form}
          onClose={() => setForm(null)}
          onSave={(event) => save(event, form === "new" ? null : form)}
          projects={projects}
          workspaceLabel={workspaceLabel}
        />
      )}
      <ConfirmDialog
        confirmLabel="Delete activity"
        description={
          deleting
            ? `"${deleting.title}" on ${dateLabel(deleting.startDate)} will be removed from the calendar. This cannot be undone.`
            : ""
        }
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          setDeleting(null);
          void mutate(() => onDelete(deleting))
            .then(() => onNotice(`${deleting.title} deleted`))
            .catch(reportActionError);
        }}
        open={!!deleting}
        title="Delete this activity?"
      />
    </div>
  );
}
