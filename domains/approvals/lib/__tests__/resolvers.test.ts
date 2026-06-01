jest.mock("server-only", () => ({}));
jest.mock("@/domains/roles/dal/event-staff", () => ({
  upsertEventStaff: jest.fn(),
  removeEventStaff: jest.fn(),
}));
jest.mock("@/domains/roles/dal/series-staff", () => ({
  upsertSeriesStaff: jest.fn(),
  removeSeriesStaff: jest.fn(),
}));
jest.mock("@/domains/roles/dal/church-memberships", () => ({
  upsertChurchMembership: jest.fn(),
  removeChurchMembership: jest.fn(),
}));

import { APPROVAL_CONFIG } from "../resolvers";
import * as eventStaffDal from "@/domains/roles/dal/event-staff";
import * as seriesStaffDal from "@/domains/roles/dal/series-staff";
import * as churchMembershipDal from "@/domains/roles/dal/church-memberships";

const mockUpsertEventStaff = eventStaffDal.upsertEventStaff as jest.Mock;
const mockRemoveEventStaff = eventStaffDal.removeEventStaff as jest.Mock;
const mockUpsertSeriesStaff = seriesStaffDal.upsertSeriesStaff as jest.Mock;
const mockRemoveSeriesStaff = seriesStaffDal.removeSeriesStaff as jest.Mock;
const mockUpsertChurchMembership =
  churchMembershipDal.upsertChurchMembership as jest.Mock;
const mockRemoveChurchMembership =
  churchMembershipDal.removeChurchMembership as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("APPROVAL_CONFIG structure", () => {
  it("defines config for EVENT, SERIES, and CHURCH", () => {
    expect(APPROVAL_CONFIG).toHaveProperty("EVENT");
    expect(APPROVAL_CONFIG).toHaveProperty("SERIES");
    expect(APPROVAL_CONFIG).toHaveProperty("CHURCH");
  });

  it("EVENT config has expected role and approveCapability", () => {
    expect(APPROVAL_CONFIG.EVENT.role).toBe("EVENT_EDITOR");
    expect(APPROVAL_CONFIG.EVENT.approveCapability).toBe("event:manage_staff");
  });

  it("SERIES config has expected role and approveCapability", () => {
    expect(APPROVAL_CONFIG.SERIES.role).toBe("SERIES_SESSION_CREATOR");
    expect(APPROVAL_CONFIG.SERIES.approveCapability).toBe("series:update");
  });

  it("CHURCH config has expected role and approveCapability", () => {
    expect(APPROVAL_CONFIG.CHURCH.role).toBe("EVENT_CREATOR");
    expect(APPROVAL_CONFIG.CHURCH.approveCapability).toBe(
      "church:manage_members"
    );
  });
});

describe("APPROVAL_CONFIG.EVENT", () => {
  it("grant delegates to upsertEventStaff with EVENT_EDITOR role", async () => {
    mockUpsertEventStaff.mockResolvedValue({});
    await APPROVAL_CONFIG.EVENT.grant("user-1", "event-1", "reviewer-1");
    expect(mockUpsertEventStaff).toHaveBeenCalledWith(
      "user-1",
      "event-1",
      "EVENT_EDITOR",
      "reviewer-1"
    );
  });

  it("revoke delegates to removeEventStaff", async () => {
    mockRemoveEventStaff.mockResolvedValue({});
    await APPROVAL_CONFIG.EVENT.revoke("user-1", "event-1");
    expect(mockRemoveEventStaff).toHaveBeenCalledWith("user-1", "event-1");
  });
});

describe("APPROVAL_CONFIG.SERIES", () => {
  it("grant delegates to upsertSeriesStaff with SERIES_SESSION_CREATOR role", async () => {
    mockUpsertSeriesStaff.mockResolvedValue({});
    await APPROVAL_CONFIG.SERIES.grant("user-1", "series-1", "reviewer-1");
    expect(mockUpsertSeriesStaff).toHaveBeenCalledWith(
      "user-1",
      "series-1",
      "SERIES_SESSION_CREATOR",
      "reviewer-1"
    );
  });

  it("revoke delegates to removeSeriesStaff", async () => {
    mockRemoveSeriesStaff.mockResolvedValue({});
    await APPROVAL_CONFIG.SERIES.revoke("user-1", "series-1");
    expect(mockRemoveSeriesStaff).toHaveBeenCalledWith("user-1", "series-1");
  });
});

describe("APPROVAL_CONFIG.CHURCH", () => {
  it("grant delegates to upsertChurchMembership with EVENT_CREATOR role", async () => {
    mockUpsertChurchMembership.mockResolvedValue({});
    await APPROVAL_CONFIG.CHURCH.grant("user-1", "church-1", "reviewer-1");
    expect(mockUpsertChurchMembership).toHaveBeenCalledWith(
      "user-1",
      "church-1",
      "EVENT_CREATOR",
      "reviewer-1"
    );
  });

  it("revoke delegates to removeChurchMembership", async () => {
    mockRemoveChurchMembership.mockResolvedValue({});
    await APPROVAL_CONFIG.CHURCH.revoke("user-1", "church-1");
    expect(mockRemoveChurchMembership).toHaveBeenCalledWith(
      "user-1",
      "church-1"
    );
  });
});
