export { auth as proxy } from "@/auth"

export const config = {
  // Exclude API routes, static files, and image optimisation paths.
  // All /(app) pages are protected by the `authorized` callback in auth.config.ts.
  matcher: ["/((?!api|_next/static|_next/image|favicon\\.ico|.*\\..*).*)" ],
}
