import { hasEnded, hasHappened, isLive } from "../timing";

const START = new Date("2030-06-01T10:00:00.000Z");
const END = new Date("2030-06-01T12:00:00.000Z");
const event = {
  isDraft: false,
  datetime: START,
  endDatetime: END,
  cancelledAt: null,
};
const at = (iso: string) => new Date(`2030-06-01T${iso}:00.000Z`);

describe("hasHappened", () => {
  it("is true once a published Event's start has passed", () => {
    expect(hasHappened(event, at("09:59"))).toBe(false);
    expect(hasHappened(event, at("10:00"))).toBe(true);
  });

  it("is never true of a draft", () => {
    expect(hasHappened({ ...event, isDraft: true }, at("11:00"))).toBe(false);
  });
});

describe("isLive", () => {
  it("is true from the start until the end", () => {
    expect(isLive(event, at("09:59"))).toBe(false);
    expect(isLive(event, at("10:00"))).toBe(true);
    expect(isLive(event, at("11:59"))).toBe(true);
    expect(isLive(event, at("12:00"))).toBe(false);
  });

  it("is never true of a cancelled Event or a draft", () => {
    expect(isLive({ ...event, cancelledAt: START }, at("11:00"))).toBe(false);
    expect(isLive({ ...event, isDraft: true }, at("11:00"))).toBe(false);
  });

  it("is never true without an end", () => {
    expect(isLive({ ...event, endDatetime: null }, at("11:00"))).toBe(false);
  });
});

describe("hasEnded", () => {
  it("is true once a published Event's end has passed", () => {
    expect(hasEnded(event, at("11:59"))).toBe(false);
    expect(hasEnded(event, at("12:00"))).toBe(true);
  });

  it("falls back to the start without an end", () => {
    const noEnd = { ...event, endDatetime: null };
    expect(hasEnded(noEnd, at("09:59"))).toBe(false);
    expect(hasEnded(noEnd, at("10:00"))).toBe(true);
  });

  it("is never true of a draft", () => {
    expect(hasEnded({ ...event, isDraft: true }, at("13:00"))).toBe(false);
  });
});
