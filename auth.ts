import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";
import { loginSchema } from "@/lib/validations/auth";
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
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return null;

        // Block sign-in for unverified users at the auth layer
        if (!user.emailVerified) return null;

        return user;
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
      if (trigger === "update" && session?.onboardingCompleted !== undefined) {
        token.onboardingCompleted = session.onboardingCompleted;
        return token;
      }
      // Re-fetch from DB once per hour OR when church IDs haven't been populated yet
      const now = Math.floor(Date.now() / 1000);
      if (token.id && (token.organiserChurchIds === undefined || now - (token.iat ?? 0) > 60 * 60)) {
        const [freshUser, memberships] = await Promise.all([
          prisma.user.findUnique({
            where: { id: token.id },
            select: { role: true, onboardingCompleted: true, emailVerified: true },
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
