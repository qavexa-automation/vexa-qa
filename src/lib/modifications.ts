const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const manilaDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Date Requested and Date Modified are calendar dates people enter. Records saved before that
 * carried full timestamps, which become the Manila day they fell on.
 */
export function toModificationDate(value?: string | null): string | null {
  if (!value) return null;
  if (DATE_ONLY.test(value)) return value;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? manilaDay.format(new Date(parsed)) : null;
}

/** Why a pair of optional dates cannot be saved, or null when they are valid. */
export function modificationDatesProblem(requestedAt: string, modifiedAt: string) {
  if ((requestedAt && !DATE_ONLY.test(requestedAt)) || (modifiedAt && !DATE_ONLY.test(modifiedAt)))
    return "Enter dates as a full day, month, and year.";
  if (requestedAt && modifiedAt && modifiedAt < requestedAt)
    return "The date modified cannot be before the date requested.";
  return null;
}

// Parse calendar dates as UTC midnight and format them in UTC, so the day never shifts.
const dateFormat = new Intl.DateTimeFormat("en-PH", {
  timeZone: "UTC",
  year: "numeric",
  month: "short",
  day: "2-digit",
});
export function formatModificationDate(value?: string | null) {
  const date = toModificationDate(value);
  return date ? dateFormat.format(new Date(`${date}T00:00:00Z`)) : "—";
}
