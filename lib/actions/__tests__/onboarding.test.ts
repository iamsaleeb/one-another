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

import {
  completeOnboardingAction,
  skipOnboardingAction,
} from "@/lib/actions/onboarding";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { updateTag } from "next/cache";

const mockAuth = auth as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;
const mockUpdateTag = updateTag as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

// ── completeOnboardingAction ──────────────────────────────────────────────────

describe("completeOnboardingAction", () => {
  it("returns error when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await completeOnboardingAction({ name: "Jane" });
    expect(result).toEqual({ error: "You must be logged in." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns error when session has no user id", async () => {
    mockAuth.mockResolvedValue({ user: {} });
    const result = await completeOnboardingAction({ name: "Jane" });
    expect(result).toEqual({ error: "You must be logged in." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns fieldErrors when name is missing", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    // @ts-expect-error — testing missing required field
    const result = await completeOnboardingAction({});
    expect(result.fieldErrors?.name).toBeDefined();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("saves name and optional fields, invalidates cache, returns {}", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUpdate.mockResolvedValue({});

    const result = await completeOnboardingAction({
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
        onboardingCompleted: true,
      },
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("user-user-1");
  });

  it("stores null for missing optional fields", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUpdate.mockResolvedValue({});

    await completeOnboardingAction({ name: "Jane" });

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        name: "Jane",
        phone: null,
        dateOfBirth: null,
        image: null,
        onboardingCompleted: true,
      },
    });
  });

  it("returns fieldErrors for an invalid image URL", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const result = await completeOnboardingAction({
      name: "Jane",
      image: "not-a-url",
    });
    expect(result.fieldErrors?.image).toBeDefined();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns fieldErrors for a future dateOfBirth", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const result = await completeOnboardingAction({
      name: "Jane",
      dateOfBirth: future.toISOString().split("T")[0],
    });
    expect(result.fieldErrors?.dateOfBirth).toBeDefined();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("normalises dateOfBirth to noon UTC to avoid timezone day shifts", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUpdate.mockResolvedValue({});

    await completeOnboardingAction({ name: "Jane", dateOfBirth: "2000-01-15" });

    const saved = mockUpdate.mock.calls[0][0].data.dateOfBirth as Date;
    expect(saved.toISOString()).toBe("2000-01-15T12:00:00.000Z");
  });
});

// ── skipOnboardingAction ──────────────────────────────────────────────────────

describe("skipOnboardingAction", () => {
  it("returns error when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const result = await skipOnboardingAction("Jane");
    expect(result).toEqual({ error: "You must be logged in." });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("returns error when name is too short", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    const result = await skipOnboardingAction("J");
    expect(result.error).toBeDefined();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("saves name, marks onboardingCompleted, returns {}", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUpdate.mockResolvedValue({});

    const result = await skipOnboardingAction("Jane");

    expect(result).toEqual({});
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "Jane", onboardingCompleted: true },
    });
  });

  it("trims whitespace from name before saving", async () => {
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockUpdate.mockResolvedValue({});

    await skipOnboardingAction("  Jane  ");

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { name: "Jane", onboardingCompleted: true },
    });
  });
});
