import { localInputsToUtcDate } from "@/lib/datetime";

interface DateTimeInputs {
  date?: string;
  time?: string;
  endDate?: string;
  endTime?: string;
}

// Adds the start and end as ISO instants, and the timezone they were entered
// in. Only the browser knows the user's timezone, so it turns the local date
// and time inputs into instants before they are sent, and names the zone so
// the Event's calendar days can be taken in it.
export function withInstants<T extends DateTimeInputs>(
  data: T
): T & { datetimeISO?: string; endDatetimeISO?: string; timezone?: string } {
  return {
    ...data,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...(data.date && data.time
      ? {
          datetimeISO: localInputsToUtcDate(data.date, data.time).toISOString(),
        }
      : {}),
    ...(data.endDate && data.endTime
      ? {
          endDatetimeISO: localInputsToUtcDate(
            data.endDate,
            data.endTime
          ).toISOString(),
        }
      : {}),
  };
}
