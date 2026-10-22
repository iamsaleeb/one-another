import "server-only";
import { accessibleBy } from "@casl/prisma";
import type { Action, AppAbility } from "./ability";
import { getAbility, getSessionUserId } from "./get-ability";

// Every Ability-scoped DAL write takes these. Request callers pass nothing and
// get the session's Ability and user. Trusted callers with no session (cron,
// workers, seed) pass `systemAbility()`, plus the acting `userId` when the
// write records who made it.
export interface WriteOptions {
  ability?: AppAbility;
  userId?: string | null;
}

export interface WriteContext {
  ability: AppAbility;
  userId: string | null;
}

// An explicit Ability never borrows the session's user: who acts is whoever
// the trusted caller names.
export async function resolveWrite(opts?: WriteOptions): Promise<WriteContext> {
  if (opts?.ability)
    return { ability: opts.ability, userId: opts.userId ?? null };
  return { ability: await getAbility(), userId: await getSessionUserId() };
}

type ScopedType = "Event" | "Series";

// Scopes a query by id to the records this Ability may act on. Put first in
// `AND` so the CASL extension can short-circuit an empty condition.
export function scopedTo<T extends ScopedType>(
  ability: AppAbility,
  action: Action,
  type: T,
  id: string
) {
  return { id, AND: [accessibleBy(ability, action).ofType(type)] };
}

// Called after a scoped read found nothing: tells "missing" apart from
// "forbidden" without revealing anything the scoped read did not.
export function missingOrForbidden(
  exists: number,
  type: ScopedType
): { error: string } {
  return { error: exists ? "Unauthorised." : `${type} not found.` };
}
