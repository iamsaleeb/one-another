jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    savedEvent: {
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

import { updateTag } from "next/cache";
import { saveEventAction, unsaveEventAction } from "@/lib/actions/events-save";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

const mockUpdateTag = updateTag as jest.Mock;
const mockSavedEventCreate = prisma.savedEvent.create as jest.Mock;
const mockSavedEventDelete = prisma.savedEvent.delete as jest.Mock;
const mockAuth = auth as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user-1" } });
});

describe("saveEventAction", () => {
  it("creates a SavedEvent and invalidates cache tags", async () => {
    mockSavedEventCreate.mockResolvedValue({});
    await saveEventAction("event-1");
    expect(mockSavedEventCreate).toHaveBeenCalledWith({
      data: { userId: "user-1", eventId: "event-1" },
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("saved-events-user-1");
  });

  it("returns error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await saveEventAction("event-1");
    expect(result.error).toBeDefined();
    expect(mockSavedEventCreate).not.toHaveBeenCalled();
  });

  it("ignores P2002 duplicate error and returns empty state", async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint",
      {
        code: "P2002",
        clientVersion: "5.0.0",
      }
    );
    mockSavedEventCreate.mockRejectedValue(p2002);
    const result = await saveEventAction("event-1");
    expect(result.error).toBeUndefined();
  });
});

describe("unsaveEventAction", () => {
  it("deletes a SavedEvent and invalidates cache tags", async () => {
    mockSavedEventDelete.mockResolvedValue({});
    await unsaveEventAction("event-1");
    expect(mockSavedEventDelete).toHaveBeenCalledWith({
      where: { userId_eventId: { userId: "user-1", eventId: "event-1" } },
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("saved-events-user-1");
  });

  it("returns error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await unsaveEventAction("event-1");
    expect(result.error).toBeDefined();
    expect(mockSavedEventDelete).not.toHaveBeenCalled();
  });

  it("ignores P2025 not-found error and returns empty state", async () => {
    const p2025 = new Prisma.PrismaClientKnownRequestError("Record not found", {
      code: "P2025",
      clientVersion: "5.0.0",
    });
    mockSavedEventDelete.mockRejectedValue(p2025);
    const result = await unsaveEventAction("event-1");
    expect(result.error).toBeUndefined();
  });
});
