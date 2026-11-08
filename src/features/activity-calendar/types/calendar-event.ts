export const ACTIVITY_KINDS = ["Meeting", "Task", "Testing", "Release", "Other"] as const;
export const ACTIVITY_STATUSES = ["Scheduled", "Completed", "Cancelled"] as const;

export type CalendarEvent = {
  id: string;
  title: string;
  kind: (typeof ACTIVITY_KINDS)[number];
  status: (typeof ACTIVITY_STATUSES)[number];
  // Calendar dates and wall-clock times are always in Asia/Manila.
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  projectId: string;
  location: string;
  notes: string;
};

export type CalendarEventInput = Omit<CalendarEvent, "id">;
