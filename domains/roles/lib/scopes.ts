import "server-only";
import { accessibleBy } from "@casl/prisma";
import { prisma } from "@/lib/db";
import type { AppAbility } from "./ability";
import { getAbility } from "./get-ability";

// "Where can I act": the Churches this user may place a new Event or Series
// in, or manage the members of, filtered by the database from the same rules
// the writes enforce.
export async function getChurchTargets(
  action: "create_event" | "create_series" | "manage_members",
  ability?: AppAbility
): Promise<Array<{ id: string; name: string }>> {
  const resolved = ability ?? (await getAbility());
  return prisma.church.findMany({
    where: accessibleBy(resolved, action).ofType("Church"),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
