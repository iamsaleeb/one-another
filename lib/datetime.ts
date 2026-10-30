import { format, subHours } from "date-fns";

/**
 * Format a UTC Date for display in the browser's local timezone.
 * Uses Intl.DateTimeFormat for automatic local timezone conversion.
 * Must only be called in "use client" components — output differs between
 * server (UTC) and client (local timezone); use suppressHydrationWarning on
 * the wrapping element.
 *
 * Output: "MON, 16 MAR | 9:00 AM"
 */
export function formatEventDatetime(date: Date): string {
  const fmt = new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")}, ${get("day")} ${get("month")} | ${get("hour")}:${get("minute")} ${get("dayPeriod")}`.toUpperCase();
}

/**
 * Format a date-only value (e.g. date of birth) for display.
 * Safe in server components because date-of-birth is stored at noon UTC,
 * which prevents day-shift in all timezones (±12h from UTC).
 *
 * Output: "16 March 2000"
 */
export function formatDateOnly(date: Date): string {
  return format(date, "d MMMM yyyy");
}

/**
 * Convert separate date + time strings from HTML <input type="date"> and
 * <input type="time"> into a Date. Browsers parse "YYYY-MM-DDTHH:mm" as
 * local time, so the resulting Date value is UTC-correct when sent to the
 * server.
 */
export function localInputsToUtcDate(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}`);
}

/**
 * Convert a UTC ISO datetime string to separate local date and time strings
 * suitable for HTML <input type="date"> and <input type="time"> elements.
 * Uses JS local-timezone getters so the values reflect the user's timezone.
 * Must only be called in "use client" components.
 */
export function utcIsoToLocalInputs(iso: string): {
  date: string;
  time: string;
} {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return {
    date: `${year}-${month}-${day}`,
    time: `${hours}:${minutes}`,
  };
}

/**
 * Parse a YYYY-MM-DD date string into a UTC Date pinned to noon.
 * Displayed via date-fns `format()` in a server component running in UTC,
 * so the calendar date is always rendered correctly regardless of the user's
 * timezone. Noon (rather than midnight) gives a buffer against accidental
 * server timezone misconfiguration.
 * Use for date-only fields (e.g. dateOfBirth) that must never drift a day.
 */
export function parseDateOfBirth(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00.000Z`);
}

/** Subtract hours from a Date — replaces raw getTime() arithmetic. */
export { subHours };

/** True when `timeZone` is an IANA zone this runtime knows, e.g. "Australia/Sydney". */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** The calendar day (YYYY-MM-DD) `date` falls on in `timeZone`. */
export function dayInTimeZone(date: Date, timeZone: string): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Returns the calendar days (YYYY-MM-DD) an Event spans, from its start to its
 * end inclusive, as they fall in the Event's timezone (UTC when it has none or
 * an unknown one). They match on server and client.
 */
export function getEventDays(
  start: Date,
  endAt: Date,
  timeZone?: string | null
): string[] {
  const zone = timeZone && isValidTimeZone(timeZone) ? timeZone : "UTC";
  const days: string[] = [];
  const current = new Date(`${dayInTimeZone(start, zone)}T12:00:00.000Z`);
  const end = new Date(`${dayInTimeZone(endAt, zone)}T12:00:00.000Z`);
  while (current <= end) {
    days.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

/** Format YYYY-MM-DD as "Monday, 1 January" (long form, for registration checkboxes). */
export function formatDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  return d.toLocaleDateString("en", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Format YYYY-MM-DD as "Mon, 1 Jan" (short form, for attendee lists). */
export function formatDayShort(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  return d.toLocaleDateString("en", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
