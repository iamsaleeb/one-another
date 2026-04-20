import {
  formatEventDatetime,
  formatDateOnly,
  localInputsToUtcDate,
  parseDateOfBirth,
  subHours,
  getCampDays,
  formatDayLabel,
  formatDayShort,
} from "@/lib/datetime";

describe("formatEventDatetime", () => {
  it("formats a UTC date into the expected display string using local timezone", () => {
    // Use a fixed date and verify the structure of the output
    const date = new Date("2025-03-16T09:00:00.000Z");
    const result = formatEventDatetime(date);
    // Output is uppercase and matches "DAY, D MON | H:MM AM/PM"
    expect(result).toMatch(/^[A-Z]{3}, \d{1,2} [A-Z]{3} \| \d{1,2}:\d{2} (AM|PM)$/);
  });

  it("outputs uppercase text", () => {
    const date = new Date("2025-06-01T14:30:00.000Z");
    const result = formatEventDatetime(date);
    expect(result).toBe(result.toUpperCase());
  });
});

describe("formatDateOnly", () => {
  it("formats a noon-UTC date as 'd MMMM yyyy'", () => {
    // Stored at noon UTC — safe from day-shift in any timezone
    const date = new Date("2000-03-16T12:00:00.000Z");
    const result = formatDateOnly(date);
    expect(result).toBe("16 March 2000");
  });

  it("formats a different date correctly", () => {
    const date = new Date("1990-01-01T12:00:00.000Z");
    const result = formatDateOnly(date);
    expect(result).toBe("1 January 1990");
  });
});

describe("localInputsToUtcDate", () => {
  it("returns a Date from date and time strings", () => {
    const result = localInputsToUtcDate("2025-03-16", "09:00");
    expect(result).toBeInstanceOf(Date);
    expect(isNaN(result.getTime())).toBe(false);
  });

  it("preserves the local date and time components", () => {
    const result = localInputsToUtcDate("2025-03-16", "09:30");
    // Parsed as local time — verify local components match input
    expect(result.getFullYear()).toBe(2025);
    expect(result.getMonth()).toBe(2); // March = index 2
    expect(result.getDate()).toBe(16);
    expect(result.getHours()).toBe(9);
    expect(result.getMinutes()).toBe(30);
  });
});

describe("parseDateOfBirth", () => {
  it("pins the date to noon UTC", () => {
    const result = parseDateOfBirth("2000-03-16");
    expect(result.getUTCHours()).toBe(12);
    expect(result.getUTCMinutes()).toBe(0);
    expect(result.getUTCSeconds()).toBe(0);
  });

  it("preserves the correct calendar date in UTC", () => {
    const result = parseDateOfBirth("1990-01-01");
    expect(result.getUTCFullYear()).toBe(1990);
    expect(result.getUTCMonth()).toBe(0); // January
    expect(result.getUTCDate()).toBe(1);
  });
});

describe("subHours", () => {
  it("subtracts hours from a date", () => {
    const base = new Date("2025-03-16T10:00:00.000Z");
    const result = subHours(base, 2);
    expect(result.toISOString()).toBe("2025-03-16T08:00:00.000Z");
  });

  it("crosses day boundary correctly", () => {
    const base = new Date("2025-03-16T01:00:00.000Z");
    const result = subHours(base, 2);
    expect(result.toISOString()).toBe("2025-03-15T23:00:00.000Z");
  });
});

describe("getCampDays", () => {
  it("returns all dates inclusive between start and end", () => {
    expect(getCampDays("2026-08-07", "2026-08-09")).toEqual([
      "2026-08-07",
      "2026-08-08",
      "2026-08-09",
    ]);
  });

  it("returns a single date when start equals end", () => {
    expect(getCampDays("2026-08-07", "2026-08-07")).toEqual(["2026-08-07"]);
  });

  it("returns empty array when end is before start", () => {
    expect(getCampDays("2026-08-09", "2026-08-07")).toEqual([]);
  });
});

describe("formatDayLabel", () => {
  it("returns a long-form weekday and date string", () => {
    const result = formatDayLabel("2026-08-07");
    expect(result).toMatch(/\w+, \w+ \d{1,2}/);
  });
});

describe("formatDayShort", () => {
  it("returns a short-form weekday and date string", () => {
    const result = formatDayShort("2026-08-07");
    expect(result).toMatch(/\w+, \w+ \d{1,2}/);
  });
});
