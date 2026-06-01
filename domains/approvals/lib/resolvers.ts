// domains/approvals/lib/resolvers.ts
import "server-only";
import type {
  ChurchRole,
  EventRole,
  ResourceType,
  SeriesRole,
} from "@prisma/client";
import {
  Capabilities,
  type Capability,
} from "@/domains/roles/lib/capabilities";
import {
  upsertEventStaff,
  removeEventStaff,
} from "@/domains/roles/dal/event-staff";
import {
  upsertSeriesStaff,
  removeSeriesStaff,
} from "@/domains/roles/dal/series-staff";
import {
  upsertChurchMembership,
  removeChurchMembership,
} from "@/domains/roles/dal/church-memberships";

interface ApprovalConfig {
  role: string;
  approveCapability: Capability;
  grant: (
    requesterId: string,
    resourceId: string,
    reviewerId: string
  ) => Promise<unknown>;
  revoke: (requesterId: string, resourceId: string) => Promise<unknown>;
}

export const APPROVAL_CONFIG: Record<ResourceType, ApprovalConfig> = {
  EVENT: {
    role: "EVENT_EDITOR" as EventRole,
    approveCapability: Capabilities.EVENT_MANAGE_STAFF,
    grant: (requesterId, resourceId, reviewerId) =>
      upsertEventStaff(requesterId, resourceId, "EVENT_EDITOR", reviewerId),
    revoke: (requesterId, resourceId) =>
      removeEventStaff(requesterId, resourceId),
  },
  SERIES: {
    role: "SERIES_SESSION_CREATOR" as SeriesRole,
    approveCapability: Capabilities.SERIES_UPDATE,
    grant: (requesterId, resourceId, reviewerId) =>
      upsertSeriesStaff(
        requesterId,
        resourceId,
        "SERIES_SESSION_CREATOR",
        reviewerId
      ),
    revoke: (requesterId, resourceId) =>
      removeSeriesStaff(requesterId, resourceId),
  },
  CHURCH: {
    role: "EVENT_CREATOR" as ChurchRole,
    approveCapability: Capabilities.CHURCH_MANAGE_MEMBERS,
    grant: (requesterId, resourceId, reviewerId) =>
      upsertChurchMembership(
        requesterId,
        resourceId,
        "EVENT_CREATOR",
        reviewerId
      ),
    revoke: (requesterId, resourceId) =>
      removeChurchMembership(requesterId, resourceId),
  },
};
