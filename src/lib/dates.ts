/**
 * Calendar facts (lease start and end, billing period, due date, meter reading
 * date) are plain YYYY-MM-DD strings with no timezone. Events are ISO instants
 * in UTC. "Today", due-date comparison, and overdue evaluation resolve against
 * the property's IANA timezone, never the server's.
 */

/** A calendar date with no timezone, formatted YYYY-MM-DD. */
export type IsoDate = string;

/** An instant in time, stored in UTC. */
export type IsoTimestamp = string;

/** A billing period, formatted YYYY-MM. */
export type PeriodKey = string;

export const DEFAULT_TIMEZONE = "Asia/Manila";

const isoDateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function isoDateFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = isoDateFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    isoDateFormatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/** The current calendar date in a property's timezone. */
export function todayIn(timeZone: string = DEFAULT_TIMEZONE, now: Date = new Date()): IsoDate {
  return isoDateFormatter(timeZone).format(now);
}

export function toIsoDate(date: Date, timeZone: string = DEFAULT_TIMEZONE): IsoDate {
  return isoDateFormatter(timeZone).format(date);
}

const wallClockFormatterCache = new Map<string, Intl.DateTimeFormat>();

/** The wall-clock reading of an instant in a timezone, expressed as if it were UTC milliseconds. */
function wallClockMillis(instant: number, timeZone: string): number {
  let formatter = wallClockFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    wallClockFormatterCache.set(timeZone, formatter);
  }
  const values = Object.fromEntries(
    formatter.formatToParts(new Date(instant)).map((part) => [part.type, Number(part.value)]),
  );
  return Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );
}

/**
 * The instant a date and wall-clock time (HH:MM) name in a timezone. Staff and visitors enter
 * Manila time, so a form's "14:00" must be stored as 06:00Z, not 14:00Z.
 */
export function zonedTimestamp(
  date: IsoDate,
  time: string,
  timeZone: string = DEFAULT_TIMEZONE,
): IsoTimestamp {
  const [year, month, day] = parts(date);
  const [hour, minute] = time.split(":").map(Number);
  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  // Correct by the zone's offset at the guess, then once more in case the guess crossed a
  // daylight-saving change. Manila has none, but properties carry any IANA zone.
  let instant = wanted - (wallClockMillis(wanted, timeZone) - wanted);
  instant += wanted - wallClockMillis(instant, timeZone);
  return new Date(instant).toISOString();
}

/** The wall-clock time (HH:MM, 24-hour) of an instant in a timezone. */
export function zonedTime(timestamp: IsoTimestamp, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Date(wallClockMillis(new Date(timestamp).getTime(), timeZone))
    .toISOString()
    .slice(11, 16);
}

function parts(date: IsoDate): [number, number, number] {
  const [year, month, day] = date.split("-").map(Number);
  return [year, month, day];
}

function fromUtc(timestamp: number): IsoDate {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function toUtc(date: IsoDate): number {
  const [year, month, day] = parts(date);
  return Date.UTC(year, month - 1, day);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromUtc(toUtc(date) + days * 86_400_000);
}

export function addMonths(date: IsoDate, months: number): IsoDate {
  const [year, month, day] = parts(date);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

export function differenceInDays(later: IsoDate, earlier: IsoDate): number {
  return Math.round((toUtc(later) - toUtc(earlier)) / 86_400_000);
}

export function isBefore(date: IsoDate, other: IsoDate): boolean {
  return date < other;
}

export function isAfter(date: IsoDate, other: IsoDate): boolean {
  return date > other;
}

export function clampDayOfMonth(period: PeriodKey, day: number): IsoDate {
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const safeDay = Math.min(Math.max(day, 1), lastDay);
  return `${period}-${String(safeDay).padStart(2, "0")}`;
}

export function periodOf(date: IsoDate): PeriodKey {
  return date.slice(0, 7);
}

export function startOfPeriod(period: PeriodKey): IsoDate {
  return `${period}-01`;
}

export function endOfPeriod(period: PeriodKey): IsoDate {
  const [year, month] = period.split("-").map(Number);
  return fromUtc(Date.UTC(year, month, 0));
}

export function addPeriods(period: PeriodKey, count: number): PeriodKey {
  return periodOf(addMonths(startOfPeriod(period), count));
}

export function periodsBetween(from: PeriodKey, to: PeriodKey): PeriodKey[] {
  const result: PeriodKey[] = [];
  let cursor = from;
  while (cursor <= to) {
    result.push(cursor);
    cursor = addPeriods(cursor, 1);
  }
  return result;
}

const dateStyles = {
  long: new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "UTC" }),
  medium: new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "UTC" }),
  short: new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", timeZone: "UTC" }),
} as const;

export function formatDate(date: IsoDate, style: keyof typeof dateStyles = "medium"): string {
  return dateStyles[style].format(new Date(`${date}T00:00:00Z`));
}

export function formatPeriod(period: PeriodKey): string {
  return new Intl.DateTimeFormat("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${period}-01T00:00:00Z`));
}

export function formatPeriodShort(period: PeriodKey): string {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${period}-01T00:00:00Z`));
}

export function formatTimestamp(
  timestamp: IsoTimestamp,
  timeZone: string = DEFAULT_TIMEZONE,
): string {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(timestamp));
}

export function formatTime(timestamp: IsoTimestamp, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-PH", { timeStyle: "short", timeZone }).format(
    new Date(timestamp),
  );
}

/** A short "3 days ago" style label for activity feeds. */
export function formatRelative(timestamp: IsoTimestamp, now: Date = new Date()): string {
  const elapsed = now.getTime() - new Date(timestamp).getTime();
  const minutes = Math.round(elapsed / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

/** Days until a date, negative once the date has passed. */
export function daysUntil(date: IsoDate, today: IsoDate): number {
  return differenceInDays(date, today);
}
