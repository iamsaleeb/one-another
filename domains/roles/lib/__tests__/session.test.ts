jest.mock("server-only", () => ({}));

import type { Session } from "next-auth";
import { sessionToClaims } from "../session";

describe("sessionToClaims", () => {
  it("returns null for null session", () => {
    expect(sessionToClaims(null)).toBeNull();
  });

  it("returns null when session has no user", () => {
    expect(
      sessionToClaims({ expires: "2026-12-31" } as unknown as Session)
    ).toBeNull();
  });

  it("maps isPlatformAdmin and churchMemberships from session", () => {
    const session: Session = {
      expires: "2026-12-31",
      user: {
        id: "user-1",
        name: "Test",
        email: "test@example.com",
        image: null,
        isPlatformAdmin: true,
        churchMemberships: [{ churchId: "c1", role: "CHURCH_ADMIN" }],
        onboardingCompleted: true,
        isEmailVerified: true,
      },
    };
    expect(sessionToClaims(session)).toEqual({
      isPlatformAdmin: true,
      churchMemberships: [{ churchId: "c1", role: "CHURCH_ADMIN" }],
    });
  });

  it("defaults isPlatformAdmin to false when not set", () => {
    const session: Session = {
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
    const result = sessionToClaims(session);
    expect(result?.isPlatformAdmin).toBe(false);
    expect(result?.churchMemberships).toEqual([]);
  });
});
