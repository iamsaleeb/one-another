jest.mock("server-only", () => ({}));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/db", () => ({
  prisma: { series: { findUnique: jest.fn() } },
}));
jest.mock("@/domains/roles/lib/session", () => ({
  sessionToClaims: jest.fn(),
}));
jest.mock("@/domains/roles/dal/series-staff", () => ({
  upsertSeriesStaff: jest.fn(),
  removeSeriesStaff: jest.fn(),
}));

import {
  assignSeriesRoleAction,
  removeSeriesStaffAction,
} from "../series-staff";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { sessionToClaims } from "@/domains/roles/lib/session";
import {
  upsertSeriesStaff,
  removeSeriesStaff,
} from "@/domains/roles/dal/series-staff";

const mockAuth = auth as jest.Mock;
const mockSeriesFindUnique = prisma.series.findUnique as jest.Mock;
const mockSessionToClaims = sessionToClaims as jest.Mock;
const mockUpsert = upsertSeriesStaff as jest.Mock;
const mockRemove = removeSeriesStaff as jest.Mock;

const validSession = { user: { id: "admin-1" } };
const churchManagerClaims = {
  isPlatformAdmin: false,
  churchMemberships: [{ churchId: "c1", role: "EVENT_MANAGER" as const }],
};
const noClaims = { isPlatformAdmin: false, churchMemberships: [] };

describe("assignSeriesRoleAction", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns fieldErrors on invalid input", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockSessionToClaims.mockReturnValue(churchManagerClaims);
    const result = await assignSeriesRoleAction({});
    expect(result).toHaveProperty("fieldErrors");
  });

  it("returns error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    mockSessionToClaims.mockReturnValue(null);
    const result = await assignSeriesRoleAction({
      userId: "u1",
      seriesId: "s1",
      role: "SERIES_MANAGER",
    });
    expect(result).toEqual({ error: "Unauthorised." });
  });

  it("returns error when series not found", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockSessionToClaims.mockReturnValue(churchManagerClaims);
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
    mockAuth.mockResolvedValue(validSession);
    mockSessionToClaims.mockReturnValue(noClaims);
    mockSeriesFindUnique.mockResolvedValue({ churchId: "c1" });
    const result = await assignSeriesRoleAction({
      userId: "u1",
      seriesId: "s1",
      role: "SERIES_MANAGER",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("assigns series role when authorized", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockSessionToClaims.mockReturnValue(churchManagerClaims);
    mockSeriesFindUnique.mockResolvedValue({ churchId: "c1" });
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
});

describe("removeSeriesStaffAction", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns fieldErrors on invalid input", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockSessionToClaims.mockReturnValue(churchManagerClaims);
    const result = await removeSeriesStaffAction({});
    expect(result).toHaveProperty("fieldErrors");
  });

  it("returns error when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    mockSessionToClaims.mockReturnValue(null);
    const result = await removeSeriesStaffAction({
      userId: "u1",
      seriesId: "s1",
    });
    expect(result).toEqual({ error: "Unauthorised." });
  });

  it("returns error when series not found", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockSessionToClaims.mockReturnValue(churchManagerClaims);
    mockSeriesFindUnique.mockResolvedValue(null);
    const result = await removeSeriesStaffAction({
      userId: "u1",
      seriesId: "s1",
    });
    expect(result).toEqual({ error: "Series not found." });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("returns error when not authorized", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockSessionToClaims.mockReturnValue(noClaims);
    mockSeriesFindUnique.mockResolvedValue({ churchId: "c1" });
    const result = await removeSeriesStaffAction({
      userId: "u1",
      seriesId: "s1",
    });
    expect(result).toEqual({ error: "Unauthorised." });
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("removes series staff when authorized", async () => {
    mockAuth.mockResolvedValue(validSession);
    mockSessionToClaims.mockReturnValue(churchManagerClaims);
    mockSeriesFindUnique.mockResolvedValue({ churchId: "c1" });
    mockRemove.mockResolvedValue({});
    const result = await removeSeriesStaffAction({
      userId: "u1",
      seriesId: "s1",
    });
    expect(result).toEqual({ success: "Series staff removed." });
    expect(mockRemove).toHaveBeenCalledWith("u1", "s1");
  });
});
