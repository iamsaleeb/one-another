import "server-only";
import type {
  ChurchRole,
  EventRole,
  ResourceType,
  SeriesRole,
} from "@prisma/client";
import {
  upsertEventStaff,
  removeEventStaff,
  getEventStaffForUser,
} from "@/domains/roles/dal/event-staff";
import {
  upsertSeriesStaff,
  removeSeriesStaff,
  getSeriesStaffForUser,
} from "@/domains/roles/dal/series-staff";
import {
  upsertChurchMembership,
  removeChurchMembership,
  getChurchMembership,
} from "@/domains/roles/dal/church-memberships";

interface ApprovalConfigEntry {
  role: EventRole | SeriesRole | ChurchRole;
  grantFn: (
    resourceId: string,
    userId: string,
    assignedBy: string
  ) => Promise<unknown>;
  revokeFn: (resourceId: string, userId: string) => Promise<unknown>;
  hasRoleFn: (resourceId: string, userId: string) => Promise<boolean>;
}

export const APPROVAL_CONFIG: Record<ResourceType, ApprovalConfigEntry> = {
  EVENT: {
    role: "EVENT_EDITOR" as EventRole,
    grantFn: (resourceId, userId, assignedBy) =>
      upsertEventStaff(userId, resourceId, "EVENT_EDITOR", assignedBy),
    revokeFn: (resourceId, userId) => removeEventStaff(userId, resourceId),
    hasRoleFn: (resourceId, userId) =>
      getEventStaffForUser(userId, resourceId).then((r) => r !== null),
  },
  SERIES: {
    role: "SERIES_SESSION_CREATOR" as SeriesRole,
    grantFn: (resourceId, userId, assignedBy) =>
      upsertSeriesStaff(
        userId,
        resourceId,
        "SERIES_SESSION_CREATOR",
        assignedBy
      ),
    revokeFn: (resourceId, userId) => removeSeriesStaff(userId, resourceId),
    hasRoleFn: (resourceId, userId) =>
      getSeriesStaffForUser(userId, resourceId).then((r) => r !== null),
  },
  CHURCH: {
    role: "EVENT_CREATOR" as ChurchRole,
    grantFn: (resourceId, userId, assignedBy) =>
      upsertChurchMembership(userId, resourceId, "EVENT_CREATOR", assignedBy),
    revokeFn: (resourceId, userId) =>
      removeChurchMembership(userId, resourceId),
    hasRoleFn: (resourceId, userId) =>
      getChurchMembership(userId, resourceId).then((r) => r !== null),
  },
};
