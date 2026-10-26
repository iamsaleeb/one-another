import {
  isPubliclyVisible,
  publishedEvent,
  upcomingPublicEvents,
} from "../visibility";

describe("public Event visibility", () => {
  it("published means not a draft", () => {
    expect(publishedEvent).toEqual({ isDraft: false });
    expect(isPubliclyVisible({ isDraft: false })).toBe(true);
    expect(isPubliclyVisible({ isDraft: true })).toBe(false);
  });

  it("upcoming public Events have not ended yet, so Live ones stay listed", () => {
    const before = Date.now();
    const where = upcomingPublicEvents();
    expect(where.isDraft).toBe(false);
    expect(where.endDatetime.gt.getTime()).toBeGreaterThanOrEqual(before);
  });
});
