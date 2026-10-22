jest.mock("server-only", () => ({}));
jest.mock("@/lib/db", () => ({
  prisma: { series: { findUnique: jest.fn() } },
}));
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
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
import {
  upsertSeriesStaff,
  removeSeriesStaff,
} from "@/domains/roles/dal/series-staff";
import { grants, signInAs } from "@/domains/roles/testing";

const mockSeriesFindUnique = prisma.series.findUnique as jest.Mock;
const mockUpsert = upsertSeriesStaff as jest.Mock;
const mockRemove = removeSeriesStaff as jest.Mock;

const seriesManagerOfS1 = grants({
  series: [{ seriesId: "s1", role: "SERIES_MANAGER" }],
});

beforeEach(() => {
  jest.clearAllMocks();
  signInAs("admin-1", seriesManagerOfS1);
  mockSeriesFindUnique.mockResolvedValue({ id: "s1", churchId: "c1" });
});

describe("assignSeriesRoleAction", () => {
  it("returns fieldErrors on invalid input", async () => {
    const result = await assignSeriesRoleAction({});
    expect(result).toHaveProperty("fieldErrors");
  });

  it("returns error when unauthenticated", async () => {
    signInAs(null);
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

  it("returns error for a session creator (cannot update the Series)", async () => {
    signInAs(
      "sc-1",
      grants({ series: [{ seriesId: "s1", role: "SERIES_SESSION_CREATOR" }] })
    );
    const result = await assignSeriesRoleAction({
      userId: "u1",
      seriesId: "s1",
      role: "SERIES_MANAGER",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("assigns series role for the Series manager", async () => {
    mockUpsert.mockResolvedValue({});
    const result = await assignSeriesRoleAction({
      userId: "u1",
      seriesId: "s1",
      role: "SERIES_MANAGER",
    });
    expect(result).toEqual({ success: "Series role assigned." });
    expect(mockUpsert).toHaveBeenCalledWith(
      "u1",
      "s1",
      "SERIES_MANAGER",
      "admin-1"
    );
  });

  it("assigns series role for a Church admin via the role cascade", async () => {
    signInAs(
      "ca-1",
      grants({ church: [{ churchId: "c1", role: "CHURCH_ADMIN" }] })
    );
    mockUpsert.mockResolvedValue({});
    const result = await assignSeriesRoleAction({
      userId: "u1",
      seriesId: "s1",
      role: "SERIES_SESSION_CREATOR",
    });
    expect(result).toEqual({ success: "Series role assigned." });
  });
});

describe("removeSeriesStaffAction", () => {
  it("returns fieldErrors on invalid input", async () => {
    const result = await removeSeriesStaffAction({});
    expect(result).toHaveProperty("fieldErrors");
  });

  it("returns error when unauthenticated", async () => {
    signInAs(null);
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
    signInAs("u9", grants());
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
    expect(mockRemove).toHaveBeenCalledWith("u1", "s1");
  });
});
