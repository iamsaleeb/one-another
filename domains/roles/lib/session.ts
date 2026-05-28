import "server-only";
import type { Session } from "next-auth";
import type { RoleClaims } from "./types";

export function sessionToClaims(session: Session | null): RoleClaims | null {
  if (!session?.user) return null;
  return {
    isPlatformAdmin: session.user.isPlatformAdmin ?? false,
    churchMemberships: session.user.churchMemberships ?? [],
  };
}
