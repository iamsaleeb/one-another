jest.mock("@/auth", () => ({ auth: jest.fn() }));

jest.mock("@/lib/actions/data-events", () => ({
  getEventsPaged: jest.fn(),
  getUserAttendedEventsPaged: jest.fn(),
  getUserAttendedPastEventsPaged: jest.fn(),
  getEventsByCreatorPaged: jest.fn(),
  getEventsNotByCreatorPaged: jest.fn(),
  getMySavedEventsPaged: jest.fn(),
}));

import { auth } from "@/auth";
import {
  getEventsPaged,
  getUserAttendedEventsPaged,
  getUserAttendedPastEventsPaged,
  getEventsByCreatorPaged,
  getEventsNotByCreatorPaged,
  getMySavedEventsPaged,
} from "@/lib/actions/data-events";
import {
  loadMoreEventsAction,
  loadMoreMyUpcomingEventsAction,
  loadMoreMyPastEventsAction,
  loadMoreMyCreatedEventsAction,
  loadMoreCommunityEventsAction,
  loadMoreMySavedEventsAction,
} from "@/lib/actions/events-pagination";

const mockAuth = auth as jest.Mock;
const mockGetEventsPaged = getEventsPaged as jest.Mock;
const mockGetUserAttendedEventsPaged = getUserAttendedEventsPaged as jest.Mock;
const mockGetUserAttendedPastEventsPaged =
  getUserAttendedPastEventsPaged as jest.Mock;
const mockGetEventsByCreatorPaged = getEventsByCreatorPaged as jest.Mock;
const mockGetEventsNotByCreatorPaged = getEventsNotByCreatorPaged as jest.Mock;
const mockGetMySavedEventsPaged = getMySavedEventsPaged as jest.Mock;

const fakePage = { items: [], nextCursor: null };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetEventsPaged.mockResolvedValue(fakePage);
  mockGetUserAttendedEventsPaged.mockResolvedValue(fakePage);
  mockGetUserAttendedPastEventsPaged.mockResolvedValue(fakePage);
  mockGetEventsByCreatorPaged.mockResolvedValue(fakePage);
  mockGetEventsNotByCreatorPaged.mockResolvedValue(fakePage);
  mockGetMySavedEventsPaged.mockResolvedValue(fakePage);
});

describe("loadMoreEventsAction", () => {
  it("calls getEventsPaged with the provided cursor", async () => {
    await loadMoreEventsAction("cursor-abc");
    expect(mockGetEventsPaged).toHaveBeenCalledWith("cursor-abc");
  });

  it("works without auth", async () => {
    const result = await loadMoreEventsAction(null);
    expect(result).toEqual(fakePage);
  });
});

describe("loadMoreMyUpcomingEventsAction", () => {
  it("returns empty page when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await loadMoreMyUpcomingEventsAction(null);
    expect(result).toEqual({ items: [], nextCursor: null });
    expect(mockGetUserAttendedEventsPaged).not.toHaveBeenCalled();
  });

  it("calls getUserAttendedEventsPaged with userId and cursor when authenticated", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    await loadMoreMyUpcomingEventsAction("cursor-x");
    expect(mockGetUserAttendedEventsPaged).toHaveBeenCalledWith(
      "user-1",
      "cursor-x"
    );
  });
});

describe("loadMoreMyPastEventsAction", () => {
  it("returns empty page when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await loadMoreMyPastEventsAction(null);
    expect(result).toEqual({ items: [], nextCursor: null });
  });

  it("calls getUserAttendedPastEventsPaged with userId and cursor", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    await loadMoreMyPastEventsAction("cursor-y");
    expect(mockGetUserAttendedPastEventsPaged).toHaveBeenCalledWith(
      "user-1",
      "cursor-y"
    );
  });
});

describe("loadMoreMyCreatedEventsAction", () => {
  it("returns empty page when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await loadMoreMyCreatedEventsAction(null);
    expect(result).toEqual({ items: [], nextCursor: null });
  });

  it("calls getEventsByCreatorPaged with userId and cursor", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    await loadMoreMyCreatedEventsAction(null);
    expect(mockGetEventsByCreatorPaged).toHaveBeenCalledWith("user-1", null);
  });
});

describe("loadMoreCommunityEventsAction", () => {
  it("returns empty page when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await loadMoreCommunityEventsAction(null);
    expect(result).toEqual({ items: [], nextCursor: null });
  });

  it("calls getEventsNotByCreatorPaged with userId and cursor", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    await loadMoreCommunityEventsAction("cursor-z");
    expect(mockGetEventsNotByCreatorPaged).toHaveBeenCalledWith(
      "user-1",
      "cursor-z"
    );
  });
});

describe("loadMoreMySavedEventsAction", () => {
  it("returns empty page when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await loadMoreMySavedEventsAction("cursor-abc");
    expect(result).toEqual({ items: [], nextCursor: null });
    expect(mockGetMySavedEventsPaged).not.toHaveBeenCalled();
  });

  it("calls getMySavedEventsPaged with userId and cursor", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    await loadMoreMySavedEventsAction("cursor-abc");
    expect(mockGetMySavedEventsPaged).toHaveBeenCalledWith("user-1", "cursor-abc");
  });
});
