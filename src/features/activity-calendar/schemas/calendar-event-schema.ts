import { z } from "zod";
import { ACTIVITY_KINDS, ACTIVITY_STATUSES } from "../types/calendar-event";

const time = z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/, "Enter a valid time.");

export const calendarEventInputSchema = z.object({
  title: z.string().trim().min(1, "Enter an activity title."),
  kind: z.enum(ACTIVITY_KINDS),
  status: z.enum(ACTIVITY_STATUSES),
  startDate: z.iso.date("Enter a valid start date."),
  endDate: z.iso.date("Enter a valid end date."),
  allDay: z.boolean(),
  startTime: time,
  endTime: time,
  projectId: z.string(),
  location: z.string().trim(),
  notes: z.string().trim(),
}).superRefine((value, ctx) => {
  if (value.endDate < value.startDate) {
    ctx.addIssue({ code: "custom", path: ["endDate"], message: "End date must be on or after the start date." });
  }
  if (value.allDay) {
    if (value.startTime || value.endTime) {
      ctx.addIssue({ code: "custom", path: ["startTime"], message: "All-day activities must have empty times." });
    }
  } else {
    if (!value.startTime) ctx.addIssue({ code: "custom", path: ["startTime"], message: "Enter a start time." });
    if (!value.endTime) ctx.addIssue({ code: "custom", path: ["endTime"], message: "Enter an end time." });
    if (value.startTime && value.endTime && `${value.endDate}T${value.endTime}` <= `${value.startDate}T${value.startTime}`) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "End time must be after the start time." });
    }
  }
});

export const calendarEventSchema = calendarEventInputSchema.safeExtend({ id: z.string().min(1) });
