import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyOtp } from "@/lib/email/otp";
import { authConfig } from "./auth.config";
import type { UserRole } from "@prisma/client";

async function fetchChurchMemberships(userId: string) {
  const [organiserRows, adminRows] = await Promise.all([
    prisma.churchOrganiser.findMany({
      where: { userId },
      select: { churchId: true },
    }),
    prisma.churchAdmin.findMany({
      where: { userId },
      select: { churchId: true },
    }),
  ]);
  return {
    organiserChurchIds: organiserRows.map((r) => r.churchId),
    adminChurchIds: adminRows.map((r) => r.churchId),
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 14 * 24 * 60 * 60, // 14 days
    updateAge: 60 * 60, // re-issue JWT hourly to shorten stale-role window
  },
  providers: [
    Credentials({
      id: "otp",
      credentials: { email: {}, otp: {} },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const otp = credentials?.otp as string | undefined;
        if (!email || !otp) return null;
        const valid = await verifyOtp(`auth:${email}`, otp);
        if (!valid) return null;
        return prisma.user
          .update({
            where: { email },
            data: { emailVerified: new Date() },
          })
          .catch(() => null);
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (user) {
        if (!user.id) return token;
        const memberships = await fetchChurchMemberships(user.id);
        token.id = user.id;
        token.role = (user as { role?: UserRole }).role;
        token.onboardingCompleted =
          (user as { onboardingCompleted?: boolean }).onboardingCompleted ??
          false;
        token.isEmailVerified = !!(user as { emailVerified?: Date | null })
          .emailVerified;
        token.organiserChurchIds = memberships.organiserChurchIds;
        token.adminChurchIds = memberships.adminChurchIds;
        return token;
      }
      if (trigger === "update") {
        if (session?.onboardingCompleted !== undefined) {
          token.onboardingCompleted = session.onboardingCompleted;
        }
        if (session?.name !== undefined) {
          token.name = session.name;
        }
        if (session?.image !== undefined) {
          token.picture = session.image;
        }
        return token;
      }
      const now = Math.floor(Date.now() / 1000);
      if (
        token.id &&
        (token.organiserChurchIds === undefined ||
          now - (token.iat ?? 0) > 60 * 60)
      ) {
        const [freshUser, memberships] = await Promise.all([
          prisma.user.findUnique({
            where: { id: token.id },
            select: {
              role: true,
              onboardingCompleted: true,
              emailVerified: true,
            },
          }),
          fetchChurchMemberships(token.id),
        ]);
        if (freshUser) {
          token.role = freshUser.role;
          token.onboardingCompleted = freshUser.onboardingCompleted;
          token.isEmailVerified = !!freshUser.emailVerified;
          token.organiserChurchIds = memberships.organiserChurchIds;
          token.adminChurchIds = memberships.adminChurchIds;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) session.user.id = token.id;
      if (token.role && session.user) session.user.role = token.role;
      if (session.user) {
        session.user.onboardingCompleted = token.onboardingCompleted;
        session.user.isEmailVerified = token.isEmailVerified ?? false;
        session.user.organiserChurchIds = token.organiserChurchIds ?? [];
        session.user.adminChurchIds = token.adminChurchIds ?? [];
      }
      return session;
    },
  },
});
