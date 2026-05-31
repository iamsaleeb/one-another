import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import {
  CHURCH_ROLE_CAPABILITIES,
  EVENT_ROLE_CAPABILITIES,
  SERIES_ROLE_CAPABILITIES,
} from "./roles";
import type { Capability } from "./capabilities";

export interface Actor {
  id: string;
  isPlatformAdmin: boolean;
}

export type AuthContext = {
  churchId?: string;
  eventId?: string;
  seriesId?: string;
};

const getChurchMembership = cache((userId: string, churchId: string) =>
  prisma.churchMembership.findUnique({
    where: { userId_churchId: { userId, churchId } },
    select: { role: true },
  })
);

const getEventStaff = cache((userId: string, eventId: string) =>
  prisma.eventStaffAssignment.findUnique({
    where: { userId_eventId: { userId, eventId } },
    select: { role: true },
  })
);

const getSeriesStaff = cache((userId: string, seriesId: string) =>
  prisma.seriesStaffAssignment.findUnique({
    where: { userId_seriesId: { userId, seriesId } },
    select: { role: true },
  })
);

export async function can(
  actor: Actor,
  capability: Capability,
  context: AuthContext
): Promise<boolean> {
  if (actor.isPlatformAdmin) return true;

  const checks: Promise<boolean>[] = [];

  if (context.churchId) {
    checks.push(
      getChurchMembership(actor.id, context.churchId).then(
        (m) =>
          !!m &&
          (CHURCH_ROLE_CAPABILITIES[m.role] as string[]).includes(capability)
      )
    );
  }

  if (context.eventId) {
    checks.push(
      getEventStaff(actor.id, context.eventId).then(
        (s) =>
          !!s &&
          (EVENT_ROLE_CAPABILITIES[s.role] as string[]).includes(capability)
      )
    );
  }

  if (context.seriesId) {
    checks.push(
      getSeriesStaff(actor.id, context.seriesId).then(
        (s) =>
          !!s &&
          (SERIES_ROLE_CAPABILITIES[s.role] as string[]).includes(capability)
      )
    );
  }

  if (checks.length === 0) return false;

  const results = await Promise.all(checks);
  return results.some(Boolean);
}
