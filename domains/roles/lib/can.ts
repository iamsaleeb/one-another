import { CHURCH_ROLE_CAPABILITIES } from "./roles";
import type { Capability } from "./capabilities";
import type { RoleClaims, ScopeContext } from "./types";

export function can(
  claims: RoleClaims,
  capability: Capability,
  context: ScopeContext
): boolean {
  if (claims.isPlatformAdmin) return true;

  if (context.scope === "PLATFORM") return false;

  if (context.scope === "CHURCH") {
    const membership = claims.churchMemberships.find(
      (m) => m.churchId === context.churchId
    );
    if (!membership) return false;
    return (CHURCH_ROLE_CAPABILITIES[membership.role] as string[]).includes(
      capability
    );
  }

  if (context.scope === "EVENT") {
    const membership = claims.churchMemberships.find(
      (m) => m.churchId === context.churchId
    );
    if (
      membership &&
      (CHURCH_ROLE_CAPABILITIES[membership.role] as string[]).includes(
        capability
      )
    ) {
      return true;
    }
    return false;
  }

  return false;
}
