import "server-only";

import { accessibleBy } from "@casl/prisma";
import { prisma } from "@/lib/db";
import type { AppAbility } from "@/domains/roles/lib/ability";
import { getAbility } from "@/domains/roles/lib/get-ability";
import { upcomingPublicEvents } from "@/domains/events/lib/visibility";

// Series the user may edit. Not cached across requests: the result depends on
// the user's current Grants.
export async function getManageableSeries(ability?: AppAbility) {
  const resolved = ability ?? (await getAbility());
  return prisma.series.findMany({
    where: accessibleBy(resolved, "update").ofType("Series"),
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { events: { where: upcomingPublicEvents() } } },
      createdBy: { select: { name: true } },
    },
  });
}

export type ManageableSeries = Awaited<ReturnType<typeof getManageableSeries>>;
