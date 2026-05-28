import { churchPolicy } from "../church";
import type { RoleClaims } from "../../lib/types";

const churchAdminClaims: RoleClaims = {
  isPlatformAdmin: false,
  churchMemberships: [{ churchId: "c1", role: "CHURCH_ADMIN" }],
};

const eventManagerClaims: RoleClaims = {
  isPlatformAdmin: false,
  churchMemberships: [{ churchId: "c1", role: "EVENT_MANAGER" }],
};

describe("churchPolicy", () => {
  describe("canManage", () => {
    it("returns true for CHURCH_ADMIN", () => {
      expect(churchPolicy.canManage(churchAdminClaims, "c1")).toBe(true);
    });
    it("returns false for EVENT_MANAGER", () => {
      expect(churchPolicy.canManage(eventManagerClaims, "c1")).toBe(false);
    });
  });

  describe("canManageMembers", () => {
    it("returns true for CHURCH_ADMIN", () => {
      expect(churchPolicy.canManageMembers(churchAdminClaims, "c1")).toBe(true);
    });
    it("returns false for EVENT_MANAGER", () => {
      expect(churchPolicy.canManageMembers(eventManagerClaims, "c1")).toBe(
        false
      );
    });
  });
});
