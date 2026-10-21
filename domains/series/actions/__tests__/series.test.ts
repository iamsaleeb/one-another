jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    series: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    seriesStaffAssignment: {
      findUnique: jest.fn(),
    },
    seriesFollower: {
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("@/domains/roles/lib/session", () => ({
  getActor: jest.fn(),
}));

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import {
  createSeriesAction,
  updateSeriesAction,
  deleteSeriesAction,
  followSeriesAction,
  unfollowSeriesAction,
} from "@/domains/series/actions/series";
import { prisma } from "@/lib/db";
import { getActor } from "@/domains/roles/lib/session";

const mockRedirect = redirect as unknown as jest.Mock;
const mockUpdateTag = updateTag as jest.Mock;
const mockSeriesCreate = prisma.series.create as jest.Mock;
const mockSeriesUpdate = prisma.series.update as jest.Mock;
const mockSeriesDelete = prisma.series.delete as jest.Mock;
const mockSeriesFindUnique = prisma.series.findUnique as jest.Mock;
const mockSeriesFollowerCreate = prisma.seriesFollower.create as jest.Mock;
const mockSeriesFollowerDelete = prisma.seriesFollower.delete as jest.Mock;
const mockGetActor = getActor as jest.Mock;

function makeActor(opts: { id?: string; canResult?: boolean } = {}) {
  return {
    isAuthenticated: true as const,
    id: opts.id ?? "user-1",
    isPlatformAdmin: false,
    can: jest.fn().mockResolvedValue(opts.canResult ?? true),
    loadContext: jest.fn(),
  };
}

const guestActor = {
  isAuthenticated: false as const,
  can: jest.fn().mockResolvedValue(false),
  loadContext: jest.fn(),
};

const validData = {
  name: "Weekly Bible Study",
  description: "A weekly deep dive into scripture",
  cadence: "WEEKLY" as const,
  location: "Room 101",
  host: "Pastor John",
  tag: "Bible Study",
  churchId: "ch-1",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetActor.mockResolvedValue(makeActor());
});

describe("createSeriesAction", () => {
  it("creates a series and redirects to its detail page", async () => {
    mockSeriesCreate.mockResolvedValue({ id: "ser-1", ...validData });

    await createSeriesAction(validData);

    expect(mockSeriesCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Weekly Bible Study",
        cadence: "WEEKLY",
        location: "Room 101",
        host: "Pastor John",
        tag: "Bible Study",
        churchId: "ch-1",
      }),
    });
    expect(mockRedirect).toHaveBeenCalledWith("/series/ser-1");
  });

  it("includes churchId in the create call when provided", async () => {
    mockSeriesCreate.mockResolvedValue({
      id: "ser-2",
      ...validData,
      churchId: "ch-99",
    });

    await createSeriesAction({ ...validData, churchId: "ch-99" });

    expect(mockSeriesCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ churchId: "ch-99" }),
    });
  });

  it("returns fieldErrors when required fields are missing", async () => {
    const result = await createSeriesAction({ ...validData, name: "" });

    expect(result.fieldErrors).toBeDefined();
    expect(result.fieldErrors?.name).toBeDefined();
    expect(mockSeriesCreate).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("returns a fieldError for an invalid cadence value", async () => {
    const result = await createSeriesAction({
      ...validData,
      cadence: "DAILY" as "WEEKLY",
    });

    expect(result.fieldErrors?.cadence).toBeDefined();
    expect(mockSeriesCreate).not.toHaveBeenCalled();
  });

  it("returns a fieldError when churchId is empty", async () => {
    const result = await createSeriesAction({ ...validData, churchId: "" });

    expect(result.fieldErrors?.churchId).toBeDefined();
    expect(mockSeriesCreate).not.toHaveBeenCalled();
  });

  it("returns an unauthorized error when there is no session", async () => {
    mockGetActor.mockResolvedValue(guestActor);

    const result = await createSeriesAction(validData);

    expect(result.error).toBeDefined();
    expect(mockSeriesCreate).not.toHaveBeenCalled();
  });

  it("returns an unauthorized error when the user is not an organiser", async () => {
    mockGetActor.mockResolvedValue(guestActor);

    const result = await createSeriesAction(validData);

    expect(result.error).toBeDefined();
    expect(mockSeriesCreate).not.toHaveBeenCalled();
  });

  it("returns an error when organiser is not assigned to the church", async () => {
    mockGetActor.mockResolvedValue(makeActor({ canResult: false }));

    const result = await createSeriesAction(validData);

    expect(result.error).toBeDefined();
    expect(mockSeriesCreate).not.toHaveBeenCalled();
  });

  it("persists photoUrl when provided", async () => {
    mockSeriesCreate.mockResolvedValue({ id: "ser-photo", ...validData });

    await createSeriesAction({
      ...validData,
      photoUrl: "https://utfs.io/f/photo.jpg",
    });

    expect(mockSeriesCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        photoUrl: "https://utfs.io/f/photo.jpg",
      }),
    });
  });

  it("sets photoUrl to null when not provided", async () => {
    mockSeriesCreate.mockResolvedValue({ id: "ser-no-photo", ...validData });

    await createSeriesAction(validData);

    expect(mockSeriesCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ photoUrl: null }),
    });
  });
});

describe("followSeriesAction", () => {
  it("creates a series follower record and invalidates series cache tags", async () => {
    mockSeriesFollowerCreate.mockResolvedValue({});

    await followSeriesAction("ser-1");

    expect(mockSeriesFollowerCreate).toHaveBeenCalledWith({
      data: { seriesId: "ser-1", userId: "user-1" },
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("series-ser-1");
  });

  it("does nothing when there is no session", async () => {
    mockGetActor.mockResolvedValue(guestActor);

    await followSeriesAction("ser-1");

    expect(mockSeriesFollowerCreate).not.toHaveBeenCalled();
  });
});

describe("unfollowSeriesAction", () => {
  it("deletes the series follower record and invalidates series cache tags", async () => {
    mockSeriesFollowerDelete.mockResolvedValue({});

    await unfollowSeriesAction("ser-1");

    expect(mockSeriesFollowerDelete).toHaveBeenCalledWith({
      where: { seriesId_userId: { seriesId: "ser-1", userId: "user-1" } },
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("series-ser-1");
  });

  it("does nothing when there is no session", async () => {
    mockGetActor.mockResolvedValue(guestActor);

    await unfollowSeriesAction("ser-1");

    expect(mockSeriesFollowerDelete).not.toHaveBeenCalled();
  });
});

describe("updateSeriesAction", () => {
  const existing = { churchId: "ch-1" };

  beforeEach(() => {
    mockSeriesFindUnique.mockResolvedValue(existing);
    mockSeriesUpdate.mockResolvedValue({});
  });

  it("updates the series and redirects to its detail page", async () => {
    await updateSeriesAction("ser-1", validData);

    expect(mockSeriesUpdate).toHaveBeenCalledWith({
      where: { id: "ser-1" },
      data: expect.objectContaining({
        name: validData.name,
        churchId: validData.churchId,
      }),
    });
    expect(mockRedirect).toHaveBeenCalledWith("/series/ser-1");
  });

  it("persists photoUrl when provided", async () => {
    const dataWithPhoto = {
      ...validData,
      photoUrl: "https://utfs.io/f/photo.jpg",
    };

    await updateSeriesAction("ser-1", dataWithPhoto);

    expect(mockSeriesUpdate).toHaveBeenCalledWith({
      where: { id: "ser-1" },
      data: expect.objectContaining({
        photoUrl: "https://utfs.io/f/photo.jpg",
      }),
    });
  });

  it("sets photoUrl to null when not provided", async () => {
    await updateSeriesAction("ser-1", validData);

    expect(mockSeriesUpdate).toHaveBeenCalledWith({
      where: { id: "ser-1" },
      data: expect.objectContaining({ photoUrl: null }),
    });
  });

  it("returns fieldErrors when required fields are missing", async () => {
    const result = await updateSeriesAction("ser-1", {
      ...validData,
      name: "",
    });

    expect(result?.fieldErrors).toBeDefined();
    expect(mockSeriesUpdate).not.toHaveBeenCalled();
  });

  it("redirects to / when user is not an organiser", async () => {
    mockGetActor.mockResolvedValue(guestActor);
    mockRedirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(updateSeriesAction("ser-1", validData)).rejects.toThrow(
      "NEXT_REDIRECT"
    );

    expect(mockRedirect).toHaveBeenCalledWith("/");
    expect(mockSeriesUpdate).not.toHaveBeenCalled();
  });

  it("redirects to /organiser when series is not found", async () => {
    mockSeriesFindUnique.mockResolvedValue(null);
    mockRedirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(updateSeriesAction("ser-1", validData)).rejects.toThrow(
      "NEXT_REDIRECT"
    );

    expect(mockRedirect).toHaveBeenCalledWith("/organiser");
    expect(mockSeriesUpdate).not.toHaveBeenCalled();
  });

  it("redirects to /organiser when organiser is not assigned to the church", async () => {
    mockGetActor.mockResolvedValue(makeActor({ canResult: false }));
    mockRedirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(updateSeriesAction("ser-1", validData)).rejects.toThrow(
      "NEXT_REDIRECT"
    );

    expect(mockRedirect).toHaveBeenCalledWith("/organiser");
    expect(mockSeriesUpdate).not.toHaveBeenCalled();
  });

  it("redirects to /organiser when user lacks access to new church on church change", async () => {
    mockSeriesFindUnique.mockResolvedValue({ churchId: "ch-1" });
    const actor = makeActor();
    actor.can.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mockGetActor.mockResolvedValue(actor);
    mockRedirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(
      updateSeriesAction("ser-1", { ...validData, churchId: "ch-2" })
    ).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/organiser");
    expect(mockSeriesUpdate).not.toHaveBeenCalled();
  });
});

describe("deleteSeriesAction", () => {
  const existing = { churchId: "ch-1" };

  beforeEach(() => {
    mockSeriesFindUnique.mockResolvedValue(existing);
    mockSeriesDelete.mockResolvedValue({});
  });

  it("deletes the series and redirects to /organiser", async () => {
    await deleteSeriesAction("ser-1");

    expect(mockSeriesDelete).toHaveBeenCalledWith({ where: { id: "ser-1" } });
    expect(mockRedirect).toHaveBeenCalledWith("/organiser");
  });

  it("redirects to / when user is not an organiser", async () => {
    mockGetActor.mockResolvedValue(guestActor);
    mockRedirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(deleteSeriesAction("ser-1")).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/");
    expect(mockSeriesDelete).not.toHaveBeenCalled();
  });

  it("redirects to /organiser when series is not found", async () => {
    mockSeriesFindUnique.mockResolvedValue(null);
    mockRedirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(deleteSeriesAction("ser-1")).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/organiser");
    expect(mockSeriesDelete).not.toHaveBeenCalled();
  });

  it("redirects to /organiser when organiser is not assigned to the church", async () => {
    mockGetActor.mockResolvedValue(makeActor({ canResult: false }));
    mockRedirect.mockImplementationOnce(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(deleteSeriesAction("ser-1")).rejects.toThrow("NEXT_REDIRECT");

    expect(mockRedirect).toHaveBeenCalledWith("/organiser");
    expect(mockSeriesDelete).not.toHaveBeenCalled();
  });
});
