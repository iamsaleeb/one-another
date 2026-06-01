jest.mock("next/cache", () => ({
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
}));

jest.mock("@/domains/approvals/dal/requests", () => ({
  getMyRequestForResource: jest.fn(),
  getPendingRequestsForResource: jest.fn(),
  getAllRequestsForResource: jest.fn(),
}));

import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  getAllRequestsForResource,
} from "../data";
import * as dal from "@/domains/approvals/dal/requests";
import { cacheTag, cacheLife } from "next/cache";

const mockDalGetMy = dal.getMyRequestForResource as jest.Mock;
const mockDalGetPending = dal.getPendingRequestsForResource as jest.Mock;
const mockDalGetAll = dal.getAllRequestsForResource as jest.Mock;
const mockCacheTag = cacheTag as jest.Mock;
const mockCacheLife = cacheLife as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe("getMyRequestForResource", () => {
  it("sets cache tag and life, then delegates to DAL", async () => {
    const fakeRequest = { id: "req-1", status: "PENDING" };
    mockDalGetMy.mockResolvedValue(fakeRequest);

    const result = await getMyRequestForResource("EVENT", "e1", "u1");

    expect(mockCacheTag).toHaveBeenCalledWith("approval-EVENT-e1-u1");
    expect(mockCacheLife).toHaveBeenCalledWith("minutes");
    expect(mockDalGetMy).toHaveBeenCalledWith("u1", "EVENT", "e1");
    expect(result).toBe(fakeRequest);
  });

  it("returns null when no request exists", async () => {
    mockDalGetMy.mockResolvedValue(null);
    const result = await getMyRequestForResource("SERIES", "s1", "u2");
    expect(result).toBeNull();
    expect(mockDalGetMy).toHaveBeenCalledWith("u2", "SERIES", "s1");
  });
});

describe("getPendingRequestsForResource", () => {
  it("sets cache tag and life, then delegates to DAL", async () => {
    const fakeRequests = [{ id: "req-1" }, { id: "req-2" }];
    mockDalGetPending.mockResolvedValue(fakeRequests);

    const result = await getPendingRequestsForResource("EVENT", "e1");

    expect(mockCacheTag).toHaveBeenCalledWith("approval-pending-EVENT-e1");
    expect(mockCacheLife).toHaveBeenCalledWith("minutes");
    expect(mockDalGetPending).toHaveBeenCalledWith("EVENT", "e1");
    expect(result).toBe(fakeRequests);
  });

  it("returns empty array when no pending requests", async () => {
    mockDalGetPending.mockResolvedValue([]);
    const result = await getPendingRequestsForResource("CHURCH", "ch1");
    expect(result).toEqual([]);
  });
});

describe("getAllRequestsForResource", () => {
  it("sets cache tag and life, then delegates to DAL", async () => {
    const fakeResolved = [{ id: "req-1", status: "APPROVED" }];
    mockDalGetAll.mockResolvedValue(fakeResolved);

    const result = await getAllRequestsForResource("SERIES", "s1");

    expect(mockCacheTag).toHaveBeenCalledWith("approval-resolved-SERIES-s1");
    expect(mockCacheLife).toHaveBeenCalledWith("minutes");
    expect(mockDalGetAll).toHaveBeenCalledWith("SERIES", "s1");
    expect(result).toBe(fakeResolved);
  });

  it("returns empty array when no resolved requests", async () => {
    mockDalGetAll.mockResolvedValue([]);
    const result = await getAllRequestsForResource("EVENT", "e1");
    expect(result).toEqual([]);
  });
});
