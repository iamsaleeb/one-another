import { can } from "../can";
import { Capabilities } from "../capabilities";
import type { RoleClaims } from "../types";

const platformAdminClaims: RoleClaims = {
  isPlatformAdmin: true,
  churchMemberships: [],
};

const churchAdminClaims: RoleClaims = {
  isPlatformAdmin: false,
  churchMemberships: [{ churchId: "church-1", role: "CHURCH_ADMIN" }],
};

const eventManagerClaims: RoleClaims = {
  isPlatformAdmin: false,
  churchMemberships: [{ churchId: "church-1", role: "EVENT_MANAGER" }],
};

const eventCreatorClaims: RoleClaims = {
  isPlatformAdmin: false,
  churchMemberships: [{ churchId: "church-1", role: "EVENT_CREATOR" }],
};

const noClaims: RoleClaims = {
  isPlatformAdmin: false,
  churchMemberships: [],
};

describe("can", () => {
  describe("platform admin shortcircuit", () => {
    it("returns true for any capability in any context", () => {
      expect(
        can(platformAdminClaims, Capabilities.CHURCH_MANAGE, {
          scope: "CHURCH",
          churchId: "church-1",
        })
      ).toBe(true);
      expect(
        can(platformAdminClaims, Capabilities.EVENT_CREATE, {
          scope: "CHURCH",
          churchId: "any",
        })
      ).toBe(true);
      expect(
        can(platformAdminClaims, Capabilities.PLATFORM_ADMIN, {
          scope: "PLATFORM",
        })
      ).toBe(true);
    });
  });

  describe("PLATFORM scope", () => {
    it("returns false for non-platform-admin", () => {
      expect(
        can(churchAdminClaims, Capabilities.PLATFORM_ADMIN, {
          scope: "PLATFORM",
        })
      ).toBe(false);
      expect(
        can(noClaims, Capabilities.PLATFORM_ADMIN, { scope: "PLATFORM" })
      ).toBe(false);
    });
  });

  describe("CHURCH scope", () => {
    it("returns true when CHURCH_ADMIN has church:manage", () => {
      expect(
        can(churchAdminClaims, Capabilities.CHURCH_MANAGE, {
          scope: "CHURCH",
          churchId: "church-1",
        })
      ).toBe(true);
    });
    it("returns true when CHURCH_ADMIN has church:manage_members", () => {
      expect(
        can(churchAdminClaims, Capabilities.CHURCH_MANAGE_MEMBERS, {
          scope: "CHURCH",
          churchId: "church-1",
        })
      ).toBe(true);
    });
    it("returns false when checking a different church", () => {
      expect(
        can(churchAdminClaims, Capabilities.CHURCH_MANAGE, {
          scope: "CHURCH",
          churchId: "church-2",
        })
      ).toBe(false);
    });
    it("returns false when EVENT_CREATOR checks church:manage", () => {
      expect(
        can(eventCreatorClaims, Capabilities.CHURCH_MANAGE, {
          scope: "CHURCH",
          churchId: "church-1",
        })
      ).toBe(false);
    });
    it("returns true when EVENT_MANAGER checks event:create", () => {
      expect(
        can(eventManagerClaims, Capabilities.EVENT_CREATE, {
          scope: "CHURCH",
          churchId: "church-1",
        })
      ).toBe(true);
    });
    it("returns true when EVENT_CREATOR checks event:create", () => {
      expect(
        can(eventCreatorClaims, Capabilities.EVENT_CREATE, {
          scope: "CHURCH",
          churchId: "church-1",
        })
      ).toBe(true);
    });
    it("returns false when EVENT_CREATOR checks event:publish", () => {
      expect(
        can(eventCreatorClaims, Capabilities.EVENT_PUBLISH, {
          scope: "CHURCH",
          churchId: "church-1",
        })
      ).toBe(false);
    });
    it("returns false with no memberships", () => {
      expect(
        can(noClaims, Capabilities.EVENT_CREATE, {
          scope: "CHURCH",
          churchId: "church-1",
        })
      ).toBe(false);
    });
  });

  describe("EVENT scope", () => {
    it("returns true via church membership inheritance for CHURCH_ADMIN", () => {
      expect(
        can(churchAdminClaims, Capabilities.EVENT_UPDATE, {
          scope: "EVENT",
          eventId: "event-1",
          churchId: "church-1",
        })
      ).toBe(true);
    });
    it("returns true via church membership inheritance for EVENT_MANAGER", () => {
      expect(
        can(eventManagerClaims, Capabilities.EVENT_UPDATE, {
          scope: "EVENT",
          eventId: "event-1",
          churchId: "church-1",
        })
      ).toBe(true);
    });
    it("returns false when no church membership matches (event staff not in claims)", () => {
      expect(
        can(noClaims, Capabilities.EVENT_UPDATE, {
          scope: "EVENT",
          eventId: "event-1",
          churchId: "church-1",
        })
      ).toBe(false);
    });
    it("returns false when church membership is for a different church", () => {
      expect(
        can(churchAdminClaims, Capabilities.EVENT_UPDATE, {
          scope: "EVENT",
          eventId: "event-1",
          churchId: "church-2",
        })
      ).toBe(false);
    });
  });
});
