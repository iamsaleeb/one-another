import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyOtp } from "@/domains/auth/email/otp";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 14 * 24 * 60 * 60, // 14 days
    updateAge: 60 * 60, // re-issue JWT hourly to refresh profile flags
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
      // Grants are never stored in the token (ADR 0001); only profile flags.
      const shouldRefresh =
        !!user ||
        token.onboardingCompleted === undefined ||
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
        const freshUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { onboardingCompleted: true, emailVerified: true },
        });
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
        session.user.onboardingCompleted = token.onboardingCompleted ?? false;
        session.user.isEmailVerified = token.isEmailVerified ?? false;
      }
      return session;
    },
  },
});
