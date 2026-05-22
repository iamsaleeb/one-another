jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
}));

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}));

import { updateProfileAction } from "@/lib/actions/profile";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { updateTag } from "next/cache";

const mockAuth = auth as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;
const mockUpdateTag = updateTag as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("updateProfileAction", () => {
  it("returns error when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await updateProfileAction({ name: "Jane" });
    expect(result).toEqual({ error: "You must be logged in." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns error when session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} });
    const result = await updateProfileAction({ name: "Jane" });
    expect(result).toEqual({ error: "You must be logged in." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns fieldErrors when name is too short", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const result = await updateProfileAction({ name: "X" });
    expect(result.fieldErrors?.name).toBeDefined();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("saves all fields, invalidates cache, returns {}", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUpdate.mockResolvedValue({});

    const result = await updateProfileAction({
      name: "Jane Doe",
      phone: "0412345678",
      dateOfBirth: "1990-05-15",
      image: "https://example.com/photo.jpg",
    });

    expect(result).toEqual({});
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        name: "Jane Doe",
        phone: "0412345678",
        dateOfBirth: new Date("1990-05-15T12:00:00.000Z"),
        image: "https://example.com/photo.jpg",
      },
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("user-user-1");
  });

  it("stores null for omitted optional fields", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUpdate.mockResolvedValue({});

    await updateProfileAction({ name: "Jane" });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        name: "Jane",
        phone: null,
        dateOfBirth: null,
        image: null,
      },
    });
  });

  it("does NOT set onboardingCompleted", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUpdate.mockResolvedValue({});

    await updateProfileAction({ name: "Jane" });

    const data = mockUpdate.mock.calls[0][0].data;
    expect(data).not.toHaveProperty("onboardingCompleted");
  });

  it("returns fieldErrors for an invalid image URL", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const result = await updateProfileAction({ name: "Jane", image: "not-a-url" });
    expect(result.fieldErrors?.image).toBeDefined();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("normalises dateOfBirth to noon UTC", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUpdate.mockResolvedValue({});

    await updateProfileAction({ name: "Jane", dateOfBirth: "2000-01-15" });

    const saved = mockUpdate.mock.calls[0][0].data.dateOfBirth as Date;
    expect(saved.toISOString()).toBe("2000-01-15T12:00:00.000Z");
  });
});
