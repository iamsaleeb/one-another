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
import { upsertEventStaff } from "@/domains/roles/dal/event-staff";
import { upsertSeriesStaff } from "@/domains/roles/dal/series-staff";
import { upsertChurchMembership } from "@/domains/roles/dal/church-memberships";

interface ApprovalConfig {
  role: string;
  approveCapability: Capability;
  grant: (
    requesterId: string,
    resourceId: string,
    reviewerId: string
  ) => Promise<unknown>;
}

export const APPROVAL_CONFIG: Record<ResourceType, ApprovalConfig> = {
  EVENT: {
    role: "EVENT_EDITOR" as EventRole,
    approveCapability: Capabilities.EVENT_MANAGE_STAFF,
    grant: (requesterId, resourceId, reviewerId) =>
      upsertEventStaff(requesterId, resourceId, "EVENT_EDITOR", reviewerId),
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
  },
};
