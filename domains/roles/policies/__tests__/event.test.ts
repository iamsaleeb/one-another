import { eventPolicy } from "../event";
import type { RoleClaims } from "../../lib/types";

const managerClaims: RoleClaims = {
  isPlatformAdmin: false,
  churchMemberships: [{ churchId: "c1", role: "EVENT_MANAGER" }],
};

const creatorClaims: RoleClaims = {
  isPlatformAdmin: false,
  churchMemberships: [{ churchId: "c1", role: "EVENT_CREATOR" }],
};

const noClaims: RoleClaims = { isPlatformAdmin: false, churchMemberships: [] };

describe("eventPolicy", () => {
  describe("canCreate", () => {
    it("returns true for EVENT_MANAGER in church", () => {
      expect(eventPolicy.canCreate(managerClaims, "c1")).toBe(true);
    });
    it("returns true for EVENT_CREATOR in church", () => {
      expect(eventPolicy.canCreate(creatorClaims, "c1")).toBe(true);
    });
    it("returns false with no claims", () => {
      expect(eventPolicy.canCreate(noClaims, "c1")).toBe(false);
    });
  });

  describe("canPublish", () => {
    it("returns true for EVENT_MANAGER", () => {
      expect(eventPolicy.canPublish(managerClaims, "c1")).toBe(true);
    });
    it("returns false for EVENT_CREATOR", () => {
      expect(eventPolicy.canPublish(creatorClaims, "c1")).toBe(false);
    });
  });

  describe("canEdit (EVENT scope)", () => {
    it("returns true for EVENT_MANAGER via church inheritance", () => {
      expect(eventPolicy.canEdit(managerClaims, "e1", "c1")).toBe(true);
    });
    it("returns false when no matching church", () => {
      expect(eventPolicy.canEdit(managerClaims, "e1", "c2")).toBe(false);
    });
  });

  describe("canDelete", () => {
    it("returns true for EVENT_MANAGER", () => {
      expect(eventPolicy.canDelete(managerClaims, "c1")).toBe(true);
    });
    it("returns false for EVENT_CREATOR", () => {
      expect(eventPolicy.canDelete(creatorClaims, "c1")).toBe(false);
    });
  });
});
