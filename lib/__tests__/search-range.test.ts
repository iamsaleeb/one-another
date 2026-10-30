import { whenRange } from "../search-range";

const SYDNEY = "Australia/Sydney";

// Wednesday 3 June 2026, 08:30 in Sydney (AEST, UTC+10).
const WEDNESDAY = new Date("2026-06-02T22:30:00.000Z");

const iso = (r: { gte: Date; lt: Date }) => ({
  gte: r.gte.toISOString(),
  lt: r.lt.toISOString(),
});

describe("whenRange", () => {
  it("takes today in the searcher's timezone, not UTC's", () => {
    // In UTC it is still Tuesday 2 June.
    expect(iso(whenRange("today", SYDNEY, WEDNESDAY))).toEqual({
      gte: "2026-06-02T14:00:00.000Z",
      lt: "2026-06-03T14:00:00.000Z",
    });
  });

  it("takes tomorrow as the day after", () => {
    expect(iso(whenRange("tomorrow", SYDNEY, WEDNESDAY))).toEqual({
      gte: "2026-06-03T14:00:00.000Z",
      lt: "2026-06-04T14:00:00.000Z",
    });
  });

  it("takes the coming weekend on a weekday", () => {
    expect(iso(whenRange("weekend", SYDNEY, WEDNESDAY))).toEqual({
      gte: "2026-06-05T14:00:00.000Z", // Saturday 6 June
      lt: "2026-06-07T14:00:00.000Z", // Monday 8 June
    });
  });

  it("takes the current weekend on a Saturday and on a Sunday", () => {
    const saturday = new Date("2026-06-06T01:00:00.000Z");
    const sunday = new Date("2026-06-07T01:00:00.000Z");
    const thisWeekend = {
      gte: "2026-06-05T14:00:00.000Z",
      lt: "2026-06-07T14:00:00.000Z",
    };
    expect(iso(whenRange("weekend", SYDNEY, saturday))).toEqual(thisWeekend);
    expect(iso(whenRange("weekend", SYDNEY, sunday))).toEqual(thisWeekend);
  });

  it("follows a daylight-saving change", () => {
    // Sydney moves from UTC+10 to UTC+11 on Sunday 4 October 2026.
    const saturday = new Date("2026-10-03T01:00:00.000Z");
    expect(iso(whenRange("weekend", SYDNEY, saturday))).toEqual({
      gte: "2026-10-02T14:00:00.000Z",
      lt: "2026-10-04T13:00:00.000Z",
    });
  });

  it("falls back to UTC without a known timezone", () => {
    const expected = {
      gte: "2026-06-02T00:00:00.000Z",
      lt: "2026-06-03T00:00:00.000Z",
    };
    expect(iso(whenRange("today", undefined, WEDNESDAY))).toEqual(expected);
    expect(iso(whenRange("today", "Not/AZone", WEDNESDAY))).toEqual(expected);
  });
});
