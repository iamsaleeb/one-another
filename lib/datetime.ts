import { format, subHours } from "date-fns";

/**
 * Format a UTC Date for display in the browser's local timezone.
 * Uses Intl.DateTimeFormat for automatic local timezone conversion.
 * Must only be called in "use client" components — output differs between
 * server (UTC) and client (local timezone); use suppressHydrationWarning on
 * the wrapping element.
 *
 * Output: "MON, 16 MAR | 09:00 AM"
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
 * Parse a YYYY-MM-DD date string into a UTC Date pinned to noon.
 * Noon UTC avoids day-shift in any timezone (all UTC offsets are within
 * ±14h, so noon UTC is still the same calendar day everywhere).
 * Use for date-only fields (e.g. dateOfBirth) that must never drift a day.
 */
export function parseDateOfBirth(dateStr: string): Date {
  return new Date(`${dateStr}T12:00:00.000Z`);
}

/** Subtract hours from a Date — replaces raw getTime() arithmetic. */
export { subHours };
