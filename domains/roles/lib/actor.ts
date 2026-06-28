import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import {
  CHURCH_ROLE_CAPABILITIES,
  EVENT_ROLE_CAPABILITIES,
  SERIES_ROLE_CAPABILITIES,
} from "./roles";
import type { Capability } from "./capabilities";

export interface AuthContext {
  churchId?: string | null;
  eventId?: string;
  seriesId?: string;
}

export interface Access {
  can(capability: Capability): boolean;
}

export interface GuestActor {
  isAuthenticated: false;
  can(capability: Capability, context: AuthContext): Promise<boolean>;
  loadContext(ids: AuthContext): Promise<Access>;
}

export interface AuthenticatedActor {
  isAuthenticated: true;
  id: string;
  isPlatformAdmin: boolean;
  can(capability: Capability, context: AuthContext): Promise<boolean>;
  loadContext(ids: AuthContext): Promise<Access>;
}

export type Actor = GuestActor | AuthenticatedActor;

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

interface LoadedRoles {
  churchRole: string | undefined;
  eventRole: string | undefined;
  seriesRole: string | undefined;
}

function checkCapability(capability: Capability, roles: LoadedRoles): boolean {
  const { churchRole, eventRole, seriesRole } = roles;
  if (
    churchRole &&
    (
      CHURCH_ROLE_CAPABILITIES[
        churchRole as keyof typeof CHURCH_ROLE_CAPABILITIES
      ] as Capability[]
    ).includes(capability)
  )
    return true;
  if (
    eventRole &&
    (
      EVENT_ROLE_CAPABILITIES[
        eventRole as keyof typeof EVENT_ROLE_CAPABILITIES
      ] as Capability[]
    ).includes(capability)
  )
    return true;
  if (
    seriesRole &&
    (
      SERIES_ROLE_CAPABILITIES[
        seriesRole as keyof typeof SERIES_ROLE_CAPABILITIES
      ] as Capability[]
    ).includes(capability)
  )
    return true;
  return false;
}

async function loadRoles(
  userId: string,
  ids: AuthContext
): Promise<LoadedRoles> {
  const [churchMembership, eventStaff, seriesStaff] = await Promise.all([
    ids.churchId ? getChurchMembership(userId, ids.churchId) : null,
    ids.eventId ? getEventStaff(userId, ids.eventId) : null,
    ids.seriesId ? getSeriesStaff(userId, ids.seriesId) : null,
  ]);
  return {
    churchRole: churchMembership?.role,
    eventRole: eventStaff?.role,
    seriesRole: seriesStaff?.role,
  };
}

const guestAccess: Access = { can: () => false };
const adminAccess: Access = { can: () => true };

export function createGuestActor(): GuestActor {
  return {
    isAuthenticated: false,
    can: () => Promise.resolve(false),
    loadContext: () => Promise.resolve(guestAccess),
  };
}

export function createActor(
  userId: string,
  isPlatformAdmin: boolean
): AuthenticatedActor {
  return {
    isAuthenticated: true,
    id: userId,
    isPlatformAdmin,
    async can(capability, context) {
      if (isPlatformAdmin) return true;
      const roles = await loadRoles(userId, context);
      return checkCapability(capability, roles);
    },
    async loadContext(ids) {
      if (isPlatformAdmin) return adminAccess;
      const roles = await loadRoles(userId, ids);
      return { can: (capability) => checkCapability(capability, roles) };
    },
  };
}

export function createFakeAccess(
  grants: Partial<Record<Capability, boolean>>
): Access {
  return { can: (cap) => grants[cap] ?? false };
}
