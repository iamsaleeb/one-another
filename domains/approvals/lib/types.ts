// domains/approvals/lib/types.ts
export interface ApprovalActionState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
}
