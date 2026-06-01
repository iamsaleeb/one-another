// domains/approvals/lib/types.ts
export interface ApprovalActionState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface ResolvedRequest {
  id: string;
  status: "APPROVED" | "DENIED" | "CANCELLED" | "REVOKED";
  requestedRole: string;
  message: string | null;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
  requester: { id: string; name: string | null; image: string | null };
  reviewer: { id: string; name: string | null } | null;
}
