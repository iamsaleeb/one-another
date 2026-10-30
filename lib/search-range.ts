import { dayInTimeZone, isValidTimeZone } from "./datetime";
import type { WhenFilter } from "./types/search";

// The cookie the browser keeps its IANA timezone in, so the server can take
// "today" and "this weekend" as the searcher's days rather than UTC's.
export const TIME_ZONE_COOKIE = "tz";

// The timezone's offset from UTC at `date`, in milliseconds.
function zoneOffset(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const wall = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );
  return wall - Math.floor(date.getTime() / 1000) * 1000;
}

// The instant a calendar day (YYYY-MM-DD) begins in the timezone.
function startOfDay(day: string, timeZone: string): Date {
  const midnight = Date.parse(`${day}T00:00:00.000Z`);
  const guess = midnight - zoneOffset(new Date(midnight), timeZone);
  // Again at the guess, in case a daylight-saving change lies between.
  return new Date(midnight - zoneOffset(new Date(guess), timeZone));
}

function addDays(day: string, days: number): string {
  const d = new Date(`${day}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * The span a "when" filter covers, from the start of its first day up to the
 * start of the day after its last, with days taken in `timeZone` (UTC when it
 * is missing or unknown). "This weekend" is the coming Saturday and Sunday,
 * or the current one while it is the weekend.
 */
export function whenRange(
  when: WhenFilter,
  timeZone: string | undefined,
  now = new Date()
): { gte: Date; lt: Date } {
  const zone = timeZone && isValidTimeZone(timeZone) ? timeZone : "UTC";
  const today = dayInTimeZone(now, zone);
  const weekday = new Date(`${today}T12:00:00.000Z`).getUTCDay(); // 0 = Sun

  let first: string;
  let days: number;
  if (when === "today") {
    first = today;
    days = 1;
  } else if (when === "tomorrow") {
    first = addDays(today, 1);
    days = 1;
  } else {
    first = addDays(today, weekday === 0 ? -1 : 6 - weekday);
    days = 2;
  }
  return {
    gte: startOfDay(first, zone),
    lt: startOfDay(addDays(first, days), zone),
  };
}
