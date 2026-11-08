"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { OptionCombobox } from "@/components/forms/option-combobox";
import { projectOptions } from "@/components/forms/project-options";
import type { Project } from "@/lib/model";
import { blankEvent } from "../lib/calendar";
import { calendarEventInputSchema } from "../schemas/calendar-event-schema";
import { ACTIVITY_KINDS, ACTIVITY_STATUSES, type CalendarEvent, type CalendarEventInput } from "../types/calendar-event";

export function ActivityForm({ event, date, projects, disabled, onSave, onClose }: {
  event: CalendarEvent | null;
  date: string;
  projects: Project[];
  disabled: boolean;
  onSave: (event: CalendarEvent) => void;
  onClose: () => void;
}) {
  const [initial] = useState<CalendarEventInput>(() => event ? {
    title: event.title, kind: event.kind, status: event.status,
    startDate: event.startDate, endDate: event.endDate, allDay: event.allDay,
    startTime: event.startTime, endTime: event.endTime,
    projectId: projects.some((project) => project.id === event.projectId) ? event.projectId : "",
    location: event.location, notes: event.notes,
  } : blankEvent(date));
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [discard, setDiscard] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const submitting = useRef(false);
  const dirty = JSON.stringify(initial) !== JSON.stringify(values);
  const change = <K extends keyof CalendarEventInput>(key: K, value: CalendarEventInput[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  const requestClose = () => dirty ? setDiscard(true) : onClose();

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled || submitting.current) return;
    const result = calendarEventInputSchema.safeParse(values);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    submitting.current = true;
    onSave({ ...result.data, id: event?.id ?? crypto.randomUUID() });
    onClose();
  }

  function textField(key: "title" | "startDate" | "endDate" | "startTime" | "endTime" | "location", label: string, type = "text", required = false) {
    return <Field data-invalid={!!errors[key]}>
      <FieldLabel htmlFor={`activity-${key}`}>{label}{required ? " *" : " (optional)"}</FieldLabel>
      <Input id={`activity-${key}`} type={type} required={required} value={values[key]}
        aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `activity-${key}-error` : undefined}
        onChange={(e) => change(key, e.target.value)} />
      {errors[key] && <FieldError id={`activity-${key}-error`}>{errors[key]}</FieldError>}
    </Field>;
  }

  return <>
    <Dialog open onOpenChange={(open) => { if (!open) requestClose(); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        <DialogHeader className="pr-6">
          <DialogTitle className="font-sans text-xl font-semibold">{event ? "Edit activity" : "New activity"}</DialogTitle>
          <DialogDescription>Plan your QA work. All dates and times use Asia/Manila (UTC+8).</DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={submit} noValidate>
          <fieldset disabled={disabled} className="m-0 grid min-w-0 gap-4 border-0 p-0">
            {textField("title", "Activity title", "text", true)}
            <div className="grid gap-4 sm:grid-cols-2">
              <OptionCombobox id="activity-kind" label="Activity type *" placeholder="Select activity type"
                options={ACTIVITY_KINDS.map((value) => ({ value, label: value }))}
                value={values.kind} onChange={(value) => change("kind", value as CalendarEventInput["kind"])} error={errors.kind} />
              <OptionCombobox id="activity-status" label="Status *" placeholder="Select status"
                options={ACTIVITY_STATUSES.map((value) => ({ value, label: value }))}
                value={values.status} onChange={(value) => change("status", value as CalendarEventInput["status"])} error={errors.status} />
            </div>
            <Field orientation="horizontal" className="gap-3">
              <Checkbox id="activity-all-day" checked={values.allDay} onCheckedChange={(checked) => {
                setValues((current) => ({ ...current, allDay: checked, startTime: checked ? "" : "09:00", endTime: checked ? "" : "10:00" }));
                setErrors({});
              }} />
              <FieldLabel htmlFor="activity-all-day">All-day activity</FieldLabel>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              {textField("startDate", "Start date", "date", true)}
              {textField("endDate", "End date", "date", true)}
              {!values.allDay && <>{textField("startTime", "Start time", "time", true)}{textField("endTime", "End time", "time", true)}</>}
            </div>
            <OptionCombobox id="activity-project" label="Project (optional)" placeholder="Select project"
              options={[{ value: "", label: "No project" }, ...projectOptions(projects)]}
              value={values.projectId} onChange={(value) => change("projectId", value)} />
            {textField("location", "Location or meeting link")}
            <Field>
              <FieldLabel htmlFor="activity-notes">Notes (optional)</FieldLabel>
              <Textarea id="activity-notes" rows={3} placeholder="Agenda, test scope, checklist, or follow-up notes…"
                value={values.notes} onChange={(e) => change("notes", e.target.value)} />
            </Field>
            {Object.values(errors).some(Boolean) && <p role="alert" className="text-sm text-destructive">Check the highlighted fields before saving.</p>}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" onClick={requestClose}>Cancel</Button>
              <Button type="submit">{event ? "Save changes" : "Add activity"}</Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
    <ConfirmDialog open={discard} title="Discard unsaved changes?" description="Your activity has unsaved changes. Discard them and close the form?"
      confirmLabel="Discard changes" onConfirm={onClose} onCancel={() => setDiscard(false)} />
  </>;
}
