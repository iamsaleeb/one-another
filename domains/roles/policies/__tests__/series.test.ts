import { seriesPolicy } from "../series";
import type { RoleClaims } from "../../lib/types";

const adminClaims: RoleClaims = {
  isPlatformAdmin: false,
  churchMemberships: [{ churchId: "c1", role: "CHURCH_ADMIN" }],
};

const managerClaims: RoleClaims = {
  isPlatformAdmin: false,
  churchMemberships: [{ churchId: "c1", role: "EVENT_MANAGER" }],
};

const creatorClaims: RoleClaims = {
  isPlatformAdmin: false,
  churchMemberships: [{ churchId: "c1", role: "EVENT_CREATOR" }],
};

const noClaims: RoleClaims = { isPlatformAdmin: false, churchMemberships: [] };

describe("seriesPolicy", () => {
  describe("canCreate", () => {
    it("returns true for CHURCH_ADMIN", () => {
      expect(seriesPolicy.canCreate(adminClaims, "c1")).toBe(true);
    });
    it("returns true for EVENT_MANAGER", () => {
      expect(seriesPolicy.canCreate(managerClaims, "c1")).toBe(true);
    });
    it("returns false for EVENT_CREATOR", () => {
      expect(seriesPolicy.canCreate(creatorClaims, "c1")).toBe(false);
    });
    it("returns false with no membership", () => {
      expect(seriesPolicy.canCreate(noClaims, "c1")).toBe(false);
    });
  });

  describe("canUpdate", () => {
    it("returns true for CHURCH_ADMIN", () => {
      expect(seriesPolicy.canUpdate(adminClaims, "c1")).toBe(true);
    });
    it("returns true for EVENT_MANAGER", () => {
      expect(seriesPolicy.canUpdate(managerClaims, "c1")).toBe(true);
    });
    it("returns false for EVENT_CREATOR", () => {
      expect(seriesPolicy.canUpdate(creatorClaims, "c1")).toBe(false);
    });
    it("returns false with no membership", () => {
      expect(seriesPolicy.canUpdate(noClaims, "c1")).toBe(false);
    });
  });

  describe("canDelete", () => {
    it("returns true for CHURCH_ADMIN", () => {
      expect(seriesPolicy.canDelete(adminClaims, "c1")).toBe(true);
    });
    it("returns true for EVENT_MANAGER", () => {
      expect(seriesPolicy.canDelete(managerClaims, "c1")).toBe(true);
    });
    it("returns false for EVENT_CREATOR", () => {
      expect(seriesPolicy.canDelete(creatorClaims, "c1")).toBe(false);
    });
    it("returns false with no membership", () => {
      expect(seriesPolicy.canDelete(noClaims, "c1")).toBe(false);
    });
  });

  describe("canAddSession", () => {
    it("returns true for EVENT_MANAGER", () => {
      expect(seriesPolicy.canAddSession(managerClaims, "c1")).toBe(true);
    });
    it("returns true for EVENT_CREATOR", () => {
      expect(seriesPolicy.canAddSession(creatorClaims, "c1")).toBe(true);
    });
    it("returns false with no membership", () => {
      expect(seriesPolicy.canAddSession(noClaims, "c1")).toBe(false);
    });
  });
});
