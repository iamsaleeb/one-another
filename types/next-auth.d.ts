// types/next-auth.d.ts
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";

// The session carries identity and onboarding state only. Grants are loaded
// from the database on every request (see docs/adr/0001).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      onboardingCompleted: boolean;
      isEmailVerified: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    onboardingCompleted?: boolean;
    isEmailVerified?: boolean;
  }
}
