jest.mock("server-only", () => ({}));

jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("@/domains/roles/lib/session", () => ({
  getActor: jest.fn(),
}));

jest.mock("@/domains/roles/policies/church", () => ({
  churchPolicy: {
    canManageMembers: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock("@/domains/roles/dal/church-memberships", () => ({
  getChurchMembership: jest.fn(),
  upsertChurchMembership: jest.fn(),
  removeChurchMembership: jest.fn(),
}));

import { updateTag } from "next/cache";
import {
  addOrganiserToChurchAction,
  removeOrganiserFromChurchAction,
} from "@/domains/admin/actions/admin";
import { prisma } from "@/lib/db";
import { getActor } from "@/domains/roles/lib/session";
import { churchPolicy } from "@/domains/roles/policies/church";
import {
  getChurchMembership,
  upsertChurchMembership,
  removeChurchMembership,
} from "@/domains/roles/dal/church-memberships";

const mockUpdateTag = updateTag as jest.Mock;
const mockGetActor = getActor as jest.Mock;
const mockCanManageMembers = churchPolicy.canManageMembers as jest.Mock;
const mockGetChurchMembership = getChurchMembership as jest.Mock;
const mockUpsertChurchMembership = upsertChurchMembership as jest.Mock;
const mockRemoveChurchMembership = removeChurchMembership as jest.Mock;
const mockUserFindUnique = prisma.user.findUnique as jest.Mock;

const defaultActor = {
  id: "admin-1",
  isPlatformAdmin: false,
};

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value);
  }
  return fd;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetActor.mockResolvedValue(defaultActor);
  mockCanManageMembers.mockResolvedValue(true);
});

describe("addOrganiserToChurchAction", () => {
  it("returns an error when unauthenticated (getActor returns null)", async () => {
    mockGetActor.mockResolvedValue(null);

    const result = await addOrganiserToChurchAction(
      {},
      makeFormData({ churchId: "ch-1", email: "x@example.com" })
    );

    expect(result.error).toBeDefined();
    expect(mockUpsertChurchMembership).not.toHaveBeenCalled();
  });

  it("returns an error when canManageMembers returns false", async () => {
    mockCanManageMembers.mockResolvedValue(false);
    mockUserFindUnique.mockResolvedValue({ id: "user-2" });
    mockGetChurchMembership.mockResolvedValue(null);

    const result = await addOrganiserToChurchAction(
      {},
      makeFormData({ churchId: "ch-1", email: "org@example.com" })
    );

    expect(result.error).toBeDefined();
    expect(mockUpsertChurchMembership).not.toHaveBeenCalled();
  });

  it("returns an error when form data is invalid (missing email)", async () => {
    const result = await addOrganiserToChurchAction(
      {},
      makeFormData({ churchId: "ch-1" })
    );

    expect(result.error).toBeDefined();
    expect(mockUpsertChurchMembership).not.toHaveBeenCalled();
  });

  it("returns an error when no account found with that email (user.findUnique returns null)", async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const result = await addOrganiserToChurchAction(
      {},
      makeFormData({ churchId: "ch-1", email: "nobody@example.com" })
    );

    expect(result.error).toMatch(/no account/i);
    expect(mockUpsertChurchMembership).not.toHaveBeenCalled();
  });

  it("returns success without upserting when user is already an EVENT_MANAGER", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-2" });
    mockGetChurchMembership.mockResolvedValue({
      userId: "user-2",
      churchId: "ch-1",
      role: "EVENT_MANAGER",
    });

    const result = await addOrganiserToChurchAction(
      {},
      makeFormData({ churchId: "ch-1", email: "existing@example.com" })
    );

    expect(result.success).toBeDefined();
    expect(mockUpsertChurchMembership).not.toHaveBeenCalled();
  });

  it("upgrades EVENT_CREATOR to EVENT_MANAGER", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-2" });
    mockGetChurchMembership.mockResolvedValue({
      userId: "user-2",
      churchId: "ch-1",
      role: "EVENT_CREATOR",
    });
    mockUpsertChurchMembership.mockResolvedValue(undefined);

    const result = await addOrganiserToChurchAction(
      {},
      makeFormData({ churchId: "ch-1", email: "creator@example.com" })
    );

    expect(mockUpsertChurchMembership).toHaveBeenCalled();
    expect(result.success).toBeDefined();
  });

  it("calls upsertChurchMembership and updateTag on success", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "user-2" });
    mockGetChurchMembership.mockResolvedValue(null);
    mockUpsertChurchMembership.mockResolvedValue(undefined);

    const result = await addOrganiserToChurchAction(
      {},
      makeFormData({ churchId: "ch-1", email: "new@example.com" })
    );

    expect(mockUpsertChurchMembership).toHaveBeenCalled();
    expect(mockUpdateTag).toHaveBeenCalledWith("churches");
    expect(result.success).toBeDefined();
  });
});

describe("removeOrganiserFromChurchAction", () => {
  it("returns an error when unauthenticated", async () => {
    mockGetActor.mockResolvedValue(null);

    const result = await removeOrganiserFromChurchAction(
      {},
      makeFormData({ churchId: "ch-1", targetUserId: "user-2" })
    );

    expect(result.error).toBeDefined();
    expect(mockRemoveChurchMembership).not.toHaveBeenCalled();
  });

  it("returns an error when canManageMembers returns false", async () => {
    mockCanManageMembers.mockResolvedValue(false);

    const result = await removeOrganiserFromChurchAction(
      {},
      makeFormData({ churchId: "ch-1", targetUserId: "user-2" })
    );

    expect(result.error).toBeDefined();
    expect(mockRemoveChurchMembership).not.toHaveBeenCalled();
  });

  it("returns an error when required fields are missing", async () => {
    const result = await removeOrganiserFromChurchAction(
      {},
      makeFormData({ churchId: "ch-1" })
    );

    expect(result.error).toBeDefined();
    expect(mockRemoveChurchMembership).not.toHaveBeenCalled();
  });

  it("calls removeChurchMembership and updateTag on success", async () => {
    mockRemoveChurchMembership.mockResolvedValue(undefined);

    const result = await removeOrganiserFromChurchAction(
      {},
      makeFormData({ churchId: "ch-1", targetUserId: "user-2" })
    );

    expect(mockRemoveChurchMembership).toHaveBeenCalledWith("user-2", "ch-1");
    expect(mockUpdateTag).toHaveBeenCalledWith("churches");
    expect(result.success).toBeDefined();
  });
});
