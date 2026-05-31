jest.mock("@/auth", () => ({ auth: jest.fn() }));

import { sessionToActor, getActor } from "../session";
import { auth } from "@/auth";

const mockAuth = auth as jest.Mock;

const makeSession = (overrides: object) => ({
  user: { id: "u1", isPlatformAdmin: false, churchMemberships: [], ...overrides },
  expires: "2099-01-01",
});

describe("sessionToActor", () => {
  it("returns null for null session", () => {
    expect(sessionToActor(null)).toBeNull();
  });

  it("returns Actor with id and isPlatformAdmin", () => {
    expect(
      sessionToActor(makeSession({ id: "u1", isPlatformAdmin: true }) as any)
    ).toEqual({ id: "u1", isPlatformAdmin: true });
  });

  it("defaults isPlatformAdmin to false when undefined", () => {
    expect(
      sessionToActor(makeSession({ id: "u2", isPlatformAdmin: undefined }) as any)
    ).toEqual({ id: "u2", isPlatformAdmin: false });
  });
});

describe("getActor", () => {
  it("returns null when no session", async () => {
    mockAuth.mockResolvedValue(null);
    expect(await getActor()).toBeNull();
  });

  it("returns Actor from session", async () => {
    mockAuth.mockResolvedValue(
      makeSession({ id: "u3", isPlatformAdmin: true })
    );
    expect(await getActor()).toEqual({ id: "u3", isPlatformAdmin: true });
  });
});
