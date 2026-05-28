jest.mock("server-only", () => ({}));

import { sessionToClaims } from "../session";

describe("sessionToClaims", () => {
  it("returns null for null session", () => {
    expect(sessionToClaims(null)).toBeNull();
  });

  it("returns null when session has no user", () => {
    expect(sessionToClaims({ expires: "2026-12-31" } as any)).toBeNull();
  });

  it("maps isPlatformAdmin and churchMemberships from session", () => {
    const session = {
      expires: "2026-12-31",
      user: {
        id: "user-1",
        name: "Test",
        email: "test@example.com",
        image: null,
        isPlatformAdmin: true,
        churchMemberships: [{ churchId: "c1", role: "CHURCH_ADMIN" as const }],
        onboardingCompleted: true,
        isEmailVerified: true,
      },
    };
    expect(sessionToClaims(session as any)).toEqual({
      isPlatformAdmin: true,
      churchMemberships: [{ churchId: "c1", role: "CHURCH_ADMIN" }],
    });
  });

  it("defaults isPlatformAdmin to false when not set", () => {
    const session = {
      expires: "2026-12-31",
      user: {
        id: "user-1",
        name: "Test",
        email: "test@example.com",
        image: null,
        isPlatformAdmin: false,
        churchMemberships: [],
        onboardingCompleted: true,
        isEmailVerified: true,
      },
    };
    const result = sessionToClaims(session as any);
    expect(result?.isPlatformAdmin).toBe(false);
    expect(result?.churchMemberships).toEqual([]);
  });
});
