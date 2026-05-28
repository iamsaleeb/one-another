import "server-only";
import { forbidden, unauthorized } from "next/navigation";
import { can } from "./can";
import { resolveCapabilities } from "./resolve-capabilities";
import type { Capability } from "./capabilities";
import type { RoleClaims, ScopeContext } from "./types";

export function requireCapability(
  claims: RoleClaims | null,
  capability: Capability,
  context: ScopeContext
): void {
  if (!claims) unauthorized();
  if (!can(claims, capability, context)) forbidden();
}

export async function requireCapabilityAsync(
  userId: string,
  capability: Capability,
  context: ScopeContext
): Promise<void> {
  const caps = await resolveCapabilities(userId, context);
  if (!caps.has(capability)) forbidden();
}
