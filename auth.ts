import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { authConfig } from "./auth.config";
import { loginSchema } from "@/lib/validations/auth";
import type { UserRole } from "@prisma/client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 14 * 24 * 60 * 60,  // 14 days
    updateAge: 60 * 60,          // re-issue JWT hourly to shorten stale-role window
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
        token.id = user.id;
        token.role = (user as { role?: UserRole }).role;
        token.onboardingCompleted = (user as { onboardingCompleted?: boolean }).onboardingCompleted ?? false;
        token.isEmailVerified = !!(user as { emailVerified?: Date | null }).emailVerified;
      }
      if (trigger === "update" && session?.onboardingCompleted !== undefined) {
        token.onboardingCompleted = session.onboardingCompleted;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id;
      }
      if (token.role && session.user) {
        session.user.role = token.role;
      }
      if (session.user) {
        session.user.onboardingCompleted = token.onboardingCompleted;
        session.user.isEmailVerified = token.isEmailVerified ?? false;
      }
      return session;
    },
  },
});
