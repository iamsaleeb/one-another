// types/next-auth.d.ts
import "next-auth/jwt";
import type { DefaultSession } from "next-auth";
import type { ChurchRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isPlatformAdmin: boolean;
      churchMemberships: Array<{ churchId: string; role: ChurchRole }>;
      onboardingCompleted: boolean;
      isEmailVerified: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isPlatformAdmin?: boolean;
    churchMemberships?: Array<{ churchId: string; role: ChurchRole }>;
    onboardingCompleted?: boolean;
    isEmailVerified?: boolean;
  }
}
