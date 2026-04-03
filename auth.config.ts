import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register");
      const isPublicPage =
        nextUrl.pathname.startsWith("/terms") ||
        nextUrl.pathname.startsWith("/privacy") ||
        nextUrl.pathname === "/api/cron/event-reminders";
      const isOnboardingPage = nextUrl.pathname.startsWith("/onboarding");

      if (isPublicPage) return true;

      if (isAuthPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      if (isOnboardingPage) {
        if (!isLoggedIn) {
          return Response.redirect(new URL("/login", nextUrl));
        }
        if (auth?.user?.onboardingCompleted === true) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) {
        const loginUrl = new URL("/login", nextUrl);
        loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
        return Response.redirect(loginUrl);
      }

      if (auth?.user?.onboardingCompleted === false) {
        return Response.redirect(new URL("/onboarding", nextUrl));
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
