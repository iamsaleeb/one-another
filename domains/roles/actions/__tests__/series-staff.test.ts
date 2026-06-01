jest.mock("server-only", () => ({}));
jest.mock("@/lib/db", () => ({
  prisma: { series: { findUnique: jest.fn() } },
}));
jest.mock("@/domains/roles/lib/session", () => ({
  getActor: jest.fn(),
}));
jest.mock("@/domains/roles/lib/can", () => ({
  can: jest.fn().mockResolvedValue(true),
}));
jest.mock("@/domains/roles/dal/series-staff", () => ({
  upsertSeriesStaff: jest.fn(),
  removeSeriesStaff: jest.fn(),
}));

import {
  assignSeriesRoleAction,
  removeSeriesStaffAction,
} from "../series-staff";
import { prisma } from "@/lib/db";
import { getActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import {
  upsertSeriesStaff,
  removeSeriesStaff,
} from "@/domains/roles/dal/series-staff";

const mockGetActor = getActor as jest.Mock;
const mockCan = can as jest.Mock;
const mockSeriesFindUnique = prisma.series.findUnique as jest.Mock;
const mockUpsert = upsertSeriesStaff as jest.Mock;
const mockRemove = removeSeriesStaff as jest.Mock;

const validActor = { id: "admin-1", isPlatformAdmin: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetActor.mockResolvedValue(validActor);
  mockCan.mockResolvedValue(true);
  mockSeriesFindUnique.mockResolvedValue({ churchId: "c1" });
});

describe("assignSeriesRoleAction", () => {
  it("returns fieldErrors on invalid input", async () => {
    const result = await assignSeriesRoleAction({});
    expect(result).toHaveProperty("fieldErrors");
  });

  it("returns error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(null);
    const result = await assignSeriesRoleAction({
      userId: "u1",
      seriesId: "s1",
      role: "SERIES_MANAGER",
    });
    expect(result).toEqual({ error: "Unauthorised." });
  });

  it("returns error when series not found", async () => {
    mockSeriesFindUnique.mockResolvedValue(null);
    const result = await assignSeriesRoleAction({
      userId: "u1",
      seriesId: "s1",
      role: "SERIES_MANAGER",
    });
    expect(result).toEqual({ error: "Series not found." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns error when not authorized", async () => {
    mockCan.mockResolvedValue(false);
    const result = await assignSeriesRoleAction({
      userId: "u1",
      seriesId: "s1",
      role: "SERIES_MANAGER",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("assigns series role when authorized", async () => {
    mockUpsert.mockResolvedValue({});
    const result = await assignSeriesRoleAction({
      userId: "u1",
      seriesId: "s1",
      role: "SERIES_MANAGER",
    });
    expect(result).toEqual({ success: "Series role assigned." });
    expect(mockCan).toHaveBeenCalledWith(
      validActor,
      expect.any(String),
      expect.objectContaining({ churchId: "c1", seriesId: "s1" })
    );
    expect(mockUpsert).toHaveBeenCalledWith(
      "u1",
      "s1",
      "SERIES_MANAGER",
      "admin-1"
    );
  });
});

describe("removeSeriesStaffAction", () => {
  it("returns fieldErrors on invalid input", async () => {
    const result = await removeSeriesStaffAction({});
    expect(result).toHaveProperty("fieldErrors");
  });

  it("returns error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(null);
    const result = await removeSeriesStaffAction({
      userId: "u1",
      seriesId: "s1",
    });
    expect(result).toEqual({ error: "Unauthorised." });
  });

  it("returns error when series not found", async () => {
    mockSeriesFindUnique.mockResolvedValue(null);
    const result = await removeSeriesStaffAction({
      userId: "u1",
      seriesId: "s1",
    });
    expect(result).toEqual({ error: "Series not found." });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("returns error when not authorized", async () => {
    mockCan.mockResolvedValue(false);
    const result = await removeSeriesStaffAction({
      userId: "u1",
      seriesId: "s1",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("removes series staff when authorized", async () => {
    mockRemove.mockResolvedValue({});
    const result = await removeSeriesStaffAction({
      userId: "u1",
      seriesId: "s1",
    });
    expect(result).toEqual({ success: "Series staff removed." });
    expect(mockCan).toHaveBeenCalledWith(
      validActor,
      expect.any(String),
      expect.objectContaining({ churchId: "c1", seriesId: "s1" })
    );
    expect(mockRemove).toHaveBeenCalledWith("u1", "s1");
  });
});
