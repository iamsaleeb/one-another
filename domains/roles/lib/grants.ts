import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import type { ChurchRole, EventRole, SeriesRole } from "@prisma/client";

export interface Grants {
  isPlatformAdmin: boolean;
  church: Array<{ churchId: string; role: ChurchRole }>;
  series: Array<{ seriesId: string; role: SeriesRole }>;
  event: Array<{ eventId: string; role: EventRole }>;
}

// Every Grant a user holds, loaded fresh per request (see ADR 0001).
export const loadGrants = cache(async (userId: string): Promise<Grants> => {
  const [platformRole, church, series, event] = await Promise.all([
    prisma.platformRoleAssignment.findFirst({
      where: { userId, role: "PLATFORM_ADMIN" },
      select: { role: true },
    }),
    prisma.churchMembership.findMany({
      where: { userId },
      select: { churchId: true, role: true },
    }),
    prisma.seriesStaffAssignment.findMany({
      where: { userId },
      select: { seriesId: true, role: true },
    }),
    prisma.eventStaffAssignment.findMany({
      where: { userId },
      select: { eventId: true, role: true },
    }),
  ]);
  return { isPlatformAdmin: !!platformRole, church, series, event };
});
