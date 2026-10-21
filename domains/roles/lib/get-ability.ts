import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { buildAbility, type AppAbility } from "./ability";
import { loadGrants } from "./grants";

export const getSessionUserId = cache(async (): Promise<string | null> => {
  const session = await auth();
  return session?.user?.id || null;
});

// The current request's Ability. Every permission check goes through this.
export const getAbility = cache(async (): Promise<AppAbility> => {
  const userId = await getSessionUserId();
  return buildAbility(userId ? await loadGrants(userId) : null);
});
