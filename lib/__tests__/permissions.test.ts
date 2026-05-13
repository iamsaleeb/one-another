jest.mock("@/lib/db", () => ({
  prisma: {
    churchOrganiser: {
      findUnique: jest.fn(),
    },
    churchAdmin: {
      findUnique: jest.fn(),
    },
  },
}));

import {
  isOrganiserForChurch,
  isAdminForChurch,
  canManageChurch,
} from "@/lib/permissions";
import { prisma } from "@/lib/db";

const mockFindUnique = prisma.churchOrganiser.findUnique as jest.Mock;
const mockAdminFindUnique = prisma.churchAdmin.findUnique as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("isOrganiserForChurch", () => {
  it("returns true when a ChurchOrganiser record exists", async () => {
    mockFindUnique.mockResolvedValue({ userId: "user-1" });

    const result = await isOrganiserForChurch("user-1", "ch-1");

    expect(result).toBe(true);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { userId_churchId: { userId: "user-1", churchId: "ch-1" } },
      select: { userId: true },
    });
  });

  it("returns false when no ChurchOrganiser record exists", async () => {
    mockFindUnique.mockResolvedValue(null);

    const result = await isOrganiserForChurch("user-1", "ch-99");

    expect(result).toBe(false);
  });

  it("returns false and skips the DB call when userId is null", async () => {
    const result = await isOrganiserForChurch(null, "ch-1");

    expect(result).toBe(false);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns false and skips the DB call when userId is undefined", async () => {
    const result = await isOrganiserForChurch(undefined, "ch-1");

    expect(result).toBe(false);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns false and skips the DB call when churchId is null", async () => {
    const result = await isOrganiserForChurch("user-1", null);

    expect(result).toBe(false);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns false and skips the DB call when churchId is undefined", async () => {
    const result = await isOrganiserForChurch("user-1", undefined);

    expect(result).toBe(false);
    expect(mockFindUnique).not.toHaveBeenCalled();
  });
});

describe("isAdminForChurch", () => {
  it("returns true when a ChurchAdmin record exists", async () => {
    mockAdminFindUnique.mockResolvedValue({ userId: "user-1" });

    const result = await isAdminForChurch("user-1", "ch-1");

    expect(result).toBe(true);
    expect(mockAdminFindUnique).toHaveBeenCalledWith({
      where: { userId_churchId: { userId: "user-1", churchId: "ch-1" } },
      select: { userId: true },
    });
  });

  it("returns false when no ChurchAdmin record exists", async () => {
    mockAdminFindUnique.mockResolvedValue(null);

    const result = await isAdminForChurch("user-1", "ch-99");

    expect(result).toBe(false);
  });

  it("returns false and skips the DB call when userId is null", async () => {
    const result = await isAdminForChurch(null, "ch-1");

    expect(result).toBe(false);
    expect(mockAdminFindUnique).not.toHaveBeenCalled();
  });

  it("returns false and skips the DB call when userId is undefined", async () => {
    const result = await isAdminForChurch(undefined, "ch-1");

    expect(result).toBe(false);
    expect(mockAdminFindUnique).not.toHaveBeenCalled();
  });

  it("returns false and skips the DB call when churchId is null", async () => {
    const result = await isAdminForChurch("user-1", null);

    expect(result).toBe(false);
    expect(mockAdminFindUnique).not.toHaveBeenCalled();
  });

  it("returns false and skips the DB call when churchId is undefined", async () => {
    const result = await isAdminForChurch("user-1", undefined);

    expect(result).toBe(false);
    expect(mockAdminFindUnique).not.toHaveBeenCalled();
  });
});

describe("canManageChurch", () => {
  it("delegates to isOrganiserForChurch when role is ORGANISER", async () => {
    mockFindUnique.mockResolvedValue({ userId: "user-1" });

    const result = await canManageChurch("user-1", "ORGANISER", "ch-1");

    expect(result).toBe(true);
    expect(mockFindUnique).toHaveBeenCalled();
    expect(mockAdminFindUnique).not.toHaveBeenCalled();
  });

  it("delegates to isAdminForChurch when role is ADMIN", async () => {
    mockAdminFindUnique.mockResolvedValue({ userId: "user-1" });

    const result = await canManageChurch("user-1", "ADMIN", "ch-1");

    expect(result).toBe(true);
    expect(mockAdminFindUnique).toHaveBeenCalled();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns false for any other role", async () => {
    const result = await canManageChurch("user-1", "ATTENDEE", "ch-1");

    expect(result).toBe(false);
    expect(mockFindUnique).not.toHaveBeenCalled();
    expect(mockAdminFindUnique).not.toHaveBeenCalled();
  });

  it("returns false when role is null", async () => {
    const result = await canManageChurch("user-1", null, "ch-1");

    expect(result).toBe(false);
  });
});
