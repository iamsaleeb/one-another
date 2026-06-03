const mockCacheTag = jest.fn();
const mockCacheLife = jest.fn();

jest.mock("next/cache", () => ({
  cacheTag: (...args: string[]) => mockCacheTag(...args),
  cacheLife: (ttl: string) => mockCacheLife(ttl),
}));

jest.mock("@/domains/approvals/dal/requests", () => ({
  getMyRequestForResource: jest.fn(),
  getPendingRequestsForResource: jest.fn(),
  getAllRequestsForResource: jest.fn(),
  getApprovalRequestById: jest.fn(),
}));

import * as dal from "@/domains/approvals/dal/requests";
import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  getAllRequestsForResource,
  getApprovalRequestById,
} from "../data";

const mockGetMy = dal.getMyRequestForResource as jest.Mock;
const mockGetPending = dal.getPendingRequestsForResource as jest.Mock;
const mockGetAll = dal.getAllRequestsForResource as jest.Mock;
const mockGetById = dal.getApprovalRequestById as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockCacheTag.mockReset();
  mockCacheLife.mockReset();
});

describe("getMyRequestForResource", () => {
  it("sets per-user cache tag and delegates to DAL", async () => {
    mockGetMy.mockResolvedValue(null);
    await getMyRequestForResource("EVENT", "e1", "u1");
    expect(mockCacheTag).toHaveBeenCalledWith("approval-EVENT-e1-u1");
    expect(mockCacheLife).toHaveBeenCalledWith("seconds");
    expect(mockGetMy).toHaveBeenCalledWith("EVENT", "e1", "u1");
  });
});

describe("getPendingRequestsForResource", () => {
  it("sets pending cache tag and delegates to DAL", async () => {
    mockGetPending.mockResolvedValue([]);
    await getPendingRequestsForResource("SERIES", "s1");
    expect(mockCacheTag).toHaveBeenCalledWith("approval-pending-SERIES-s1");
    expect(mockCacheLife).toHaveBeenCalledWith("seconds");
    expect(mockGetPending).toHaveBeenCalledWith("SERIES", "s1");
  });
});

describe("getAllRequestsForResource", () => {
  it("sets resolved cache tag and delegates to DAL", async () => {
    mockGetAll.mockResolvedValue([]);
    await getAllRequestsForResource("CHURCH", "c1");
    expect(mockCacheTag).toHaveBeenCalledWith("approval-resolved-CHURCH-c1");
    expect(mockCacheLife).toHaveBeenCalledWith("minutes");
    expect(mockGetAll).toHaveBeenCalledWith("CHURCH", "c1");
  });
});

describe("getApprovalRequestById", () => {
  it("sets per-request cache tag and delegates to DAL", async () => {
    mockGetById.mockResolvedValue(null);
    await getApprovalRequestById("req-1");
    expect(mockCacheTag).toHaveBeenCalledWith("approval-request-req-1");
    expect(mockCacheLife).toHaveBeenCalledWith("minutes");
    expect(mockGetById).toHaveBeenCalledWith("req-1");
  });
});
