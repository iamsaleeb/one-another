jest.mock("server-only", () => ({}));
jest.mock("react", () => ({ cache: (fn: unknown) => fn }));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/db", () => ({ prisma: {} }));
jest.mock("../roles", () => ({
  CHURCH_ROLE_CAPABILITIES: {},
  EVENT_ROLE_CAPABILITIES: {},
  SERIES_ROLE_CAPABILITIES: {},
}));

import { getActor } from "../session";
import { auth } from "@/auth";
import type { Session } from "next-auth";

const mockAuth = auth as jest.Mock;

const makeSession = (overrides: object): Session =>
  ({
    user: {
      id: "u1",
      isPlatformAdmin: false,
      churchMemberships: [],
      onboardingCompleted: false,
      isEmailVerified: false,
      ...overrides,
    },
    expires: "2099-01-01",
  }) as unknown as Session;

describe("getActor", () => {
  it("returns guest actor when no session", async () => {
    mockAuth.mockResolvedValue(null);
    const actor = await getActor();
    expect(actor.isAuthenticated).toBe(false);
    expect(await actor.can("event:create", {})).toBe(false);
  });

  it("returns authenticated actor from session", async () => {
    mockAuth.mockResolvedValue(
      makeSession({ id: "u3", isPlatformAdmin: false })
    );
    const actor = await getActor();
    expect(actor.isAuthenticated).toBe(true);
    if (actor.isAuthenticated) {
      expect(actor.id).toBe("u3");
      expect(actor.isPlatformAdmin).toBe(false);
    }
  });

  it("platform admin actor has isAuthenticated true and isPlatformAdmin true", async () => {
    mockAuth.mockResolvedValue(
      makeSession({ id: "admin", isPlatformAdmin: true })
    );
    const actor = await getActor();
    expect(actor.isAuthenticated).toBe(true);
    if (actor.isAuthenticated) {
      expect(actor.isPlatformAdmin).toBe(true);
    }
  });
});
