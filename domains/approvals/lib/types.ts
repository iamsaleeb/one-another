import type { ApprovalStatus, ResourceType } from "@prisma/client";

export interface ApprovalActionState {
  error?: string;
}

export interface ResolvedRequest {
  id: string;
  requestedRole: string;
  resourceType: ResourceType;
  status: ApprovalStatus;
  message: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
  requester: { id: string; name: string | null; image: string | null };
  reviewer: { id: string; name: string } | null;
}
