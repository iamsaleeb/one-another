import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = nextUrl.pathname.startsWith("/login");
      const isPublicPage =
        nextUrl.pathname.startsWith("/terms") ||
        nextUrl.pathname.startsWith("/privacy") ||
        nextUrl.pathname === "/api/cron/process-notifications";
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

      const role = auth?.user?.role;
      if (
        nextUrl.pathname.startsWith("/organiser") &&
        role !== "ORGANISER" &&
        role !== "ADMIN"
      ) {
        return Response.redirect(new URL("/", nextUrl));
      }
      if (nextUrl.pathname.startsWith("/admin") && role !== "ADMIN") {
        return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
