jest.mock("server-only", () => ({}));
jest.mock("react", () => ({ cache: (fn: unknown) => fn }));
jest.mock("@/lib/db", () => ({
  prisma: {
    churchMembership: { findUnique: jest.fn() },
    eventStaffAssignment: { findUnique: jest.fn() },
    seriesStaffAssignment: { findUnique: jest.fn() },
  },
}));

import { can, type Actor } from "../can";
import { Capabilities } from "../capabilities";
import { prisma } from "@/lib/db";

const mockChurch = prisma.churchMembership.findUnique as jest.Mock;
const mockEvent = prisma.eventStaffAssignment.findUnique as jest.Mock;
const mockSeries = prisma.seriesStaffAssignment.findUnique as jest.Mock;

const admin: Actor = { id: "a1", isPlatformAdmin: true };
const user: Actor = { id: "u1", isPlatformAdmin: false };

beforeEach(() => jest.clearAllMocks());

describe("platform admin", () => {
  it("returns true for any capability without DB call", async () => {
    expect(await can(admin, Capabilities.EVENT_CREATE, {})).toBe(true);
    expect(mockChurch).not.toHaveBeenCalled();
  });
});

describe("empty context", () => {
  it("returns false when no context fields provided", async () => {
    expect(await can(user, Capabilities.EVENT_CREATE, {})).toBe(false);
  });
});

describe("church membership", () => {
  it("true: CHURCH_ADMIN checks church:manage", async () => {
    mockChurch.mockResolvedValue({ role: "CHURCH_ADMIN" });
    expect(await can(user, Capabilities.CHURCH_MANAGE, { churchId: "c1" })).toBe(true);
  });
  it("true: EVENT_MANAGER checks event:update", async () => {
    mockChurch.mockResolvedValue({ role: "EVENT_MANAGER" });
    expect(await can(user, Capabilities.EVENT_UPDATE, { churchId: "c1" })).toBe(true);
  });
  it("false: EVENT_CREATOR checks event:update", async () => {
    mockChurch.mockResolvedValue({ role: "EVENT_CREATOR" });
    expect(await can(user, Capabilities.EVENT_UPDATE, { churchId: "c1" })).toBe(false);
  });
  it("false: no membership", async () => {
    mockChurch.mockResolvedValue(null);
    expect(await can(user, Capabilities.EVENT_CREATE, { churchId: "c1" })).toBe(false);
  });
});

describe("event staff", () => {
  it("true: EVENT_MANAGER staff checks event:update", async () => {
    mockEvent.mockResolvedValue({ role: "EVENT_MANAGER" });
    expect(await can(user, Capabilities.EVENT_UPDATE, { eventId: "e1" })).toBe(true);
  });
  it("true: EVENT_MANAGER staff checks event:view_attendees", async () => {
    mockEvent.mockResolvedValue({ role: "EVENT_MANAGER" });
    expect(await can(user, Capabilities.EVENT_VIEW_ATTENDEES, { eventId: "e1" })).toBe(true);
  });
  it("false: EVENT_EDITOR staff checks event:manage_staff", async () => {
    mockEvent.mockResolvedValue({ role: "EVENT_EDITOR" });
    expect(await can(user, Capabilities.EVENT_MANAGE_STAFF, { eventId: "e1" })).toBe(false);
  });
  it("false: no event staff row", async () => {
    mockEvent.mockResolvedValue(null);
    expect(await can(user, Capabilities.EVENT_UPDATE, { eventId: "e1" })).toBe(false);
  });
});

describe("series staff", () => {
  it("true: SERIES_MANAGER checks series:update", async () => {
    mockSeries.mockResolvedValue({ role: "SERIES_MANAGER" });
    expect(await can(user, Capabilities.SERIES_UPDATE, { seriesId: "s1" })).toBe(true);
  });
  it("true: SERIES_MANAGER checks event:create", async () => {
    mockSeries.mockResolvedValue({ role: "SERIES_MANAGER" });
    expect(await can(user, Capabilities.EVENT_CREATE, { seriesId: "s1" })).toBe(true);
  });
  it("false: SERIES_SESSION_CREATOR checks series:update", async () => {
    mockSeries.mockResolvedValue({ role: "SERIES_SESSION_CREATOR" });
    expect(await can(user, Capabilities.SERIES_UPDATE, { seriesId: "s1" })).toBe(false);
  });
});

describe("combined context", () => {
  it("true via event staff when church membership missing", async () => {
    mockChurch.mockResolvedValue(null);
    mockEvent.mockResolvedValue({ role: "EVENT_MANAGER" });
    expect(
      await can(user, Capabilities.EVENT_UPDATE, { churchId: "c1", eventId: "e1" })
    ).toBe(true);
  });
  it("runs all provided context checks in parallel", async () => {
    mockChurch.mockResolvedValue(null);
    mockEvent.mockResolvedValue(null);
    mockSeries.mockResolvedValue({ role: "SERIES_MANAGER" });
    expect(
      await can(user, Capabilities.EVENT_CREATE, {
        churchId: "c1",
        eventId: "e1",
        seriesId: "s1",
      })
    ).toBe(true);
    expect(mockChurch).toHaveBeenCalledTimes(1);
    expect(mockEvent).toHaveBeenCalledTimes(1);
    expect(mockSeries).toHaveBeenCalledTimes(1);
  });
});
