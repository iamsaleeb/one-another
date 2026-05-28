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
        nextUrl.pathname === "/api/cron/process-notifications" ||
        nextUrl.pathname === "/" ||
        nextUrl.pathname.startsWith("/churches") ||
        nextUrl.pathname === "/series" ||
        (nextUrl.pathname !== "/series/create" &&
          /^\/series\/[^/]+$/.test(nextUrl.pathname)) ||
        (nextUrl.pathname !== "/events/create" &&
          /^\/events\/[^/]+$/.test(nextUrl.pathname));
      const isOnboardingPage = nextUrl.pathname.startsWith("/onboarding");

      if (isPublicPage) {
        if (isLoggedIn && auth?.user?.onboardingCompleted === false) {
          const onboardingUrl = new URL("/onboarding", nextUrl);
          onboardingUrl.searchParams.set("callbackUrl", nextUrl.pathname);
          return Response.redirect(onboardingUrl);
        }
        return true;
      }

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
        const onboardingUrl = new URL("/onboarding", nextUrl);
        onboardingUrl.searchParams.set("callbackUrl", nextUrl.pathname);
        return Response.redirect(onboardingUrl);
      }

      const { isPlatformAdmin, churchMemberships } = auth?.user ?? {};
      if (
        nextUrl.pathname.startsWith("/organiser") &&
        !isPlatformAdmin &&
        (!churchMemberships || churchMemberships.length === 0)
      ) {
        return Response.redirect(new URL("/", nextUrl));
      }
      if (nextUrl.pathname.startsWith("/admin") && !isPlatformAdmin) {
        return Response.redirect(new URL("/", nextUrl));
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
