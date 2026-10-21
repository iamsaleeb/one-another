import "server-only";

import { accessibleBy } from "@casl/prisma";
import { prisma } from "@/lib/db";
import type { AppAbility } from "@/domains/roles/lib/ability";
import { getAbility } from "@/domains/roles/lib/get-ability";
import type { EventCardItem } from "@/lib/types/pagination";

const PAGE_SIZE = 10;

// Events the user may edit, at any level of the role cascade. Not cached
// across requests: the result depends on the user's current Grants.
export async function getManageableEventsPaged(
  cursor: string | null,
  ability?: AppAbility
): Promise<{ items: EventCardItem[]; nextCursor: string | null }> {
  const resolved = ability ?? (await getAbility());
  const rows = await prisma.event.findMany({
    where: accessibleBy(resolved, "update").ofType("Event"),
    orderBy: [{ datetime: { sort: "asc", nulls: "last" } }, { id: "asc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      church: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
  });
  const hasMore = rows.length > PAGE_SIZE;
  return {
    items: hasMore ? rows.slice(0, PAGE_SIZE) : rows,
    nextCursor: hasMore ? rows[PAGE_SIZE - 1].id : null,
  };
}
