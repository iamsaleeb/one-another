import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyOtp } from "@/domains/auth/email/otp";
import { authConfig } from "./auth.config";

async function fetchRoleClaims(userId: string) {
  const [platformRole, churchMemberships] = await Promise.all([
    prisma.platformRoleAssignment.findFirst({ where: { userId } }),
    prisma.churchMembership.findMany({
      where: { userId },
      select: { churchId: true, role: true },
    }),
  ]);
  return {
    isPlatformAdmin: !!platformRole,
    churchMemberships,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 14 * 24 * 60 * 60,
    updateAge: 60 * 60,
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
          .update({ where: { email }, data: { emailVerified: new Date() } })
          .catch(() => null);
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      if (trigger === "update") {
        if (session?.onboardingCompleted !== undefined)
          token.onboardingCompleted = session.onboardingCompleted;
        if (session?.name !== undefined) token.name = session.name;
        if (session?.image !== undefined) token.picture = session.image;
        return token;
      }

      const now = Math.floor(Date.now() / 1000);
      const shouldRefresh =
        !!user ||
        token.isPlatformAdmin === undefined ||
        now - (token.iat ?? 0) > 60 * 60;

      if (user) {
        if (!user.id) return token;
        token.id = user.id;
        token.onboardingCompleted =
          (user as { onboardingCompleted?: boolean }).onboardingCompleted ??
          false;
        token.isEmailVerified = !!(user as { emailVerified?: Date | null })
          .emailVerified;
      }

      if (shouldRefresh && token.id) {
        const [claims, freshUser] = await Promise.all([
          fetchRoleClaims(token.id),
          prisma.user.findUnique({
            where: { id: token.id },
            select: { onboardingCompleted: true, emailVerified: true },
          }),
        ]);
        token.isPlatformAdmin = claims.isPlatformAdmin;
        token.churchMemberships = claims.churchMemberships;
        if (freshUser) {
          token.onboardingCompleted = freshUser.onboardingCompleted;
          token.isEmailVerified = !!freshUser.emailVerified;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? "";
        session.user.isPlatformAdmin = token.isPlatformAdmin ?? false;
        session.user.churchMemberships = token.churchMemberships ?? [];
        session.user.onboardingCompleted = token.onboardingCompleted ?? false;
        session.user.isEmailVerified = token.isEmailVerified ?? false;
      }
      return session;
    },
  },
});
