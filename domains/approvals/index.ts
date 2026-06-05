// Server actions — safe to call from client components (use server)
export {
  submitRequestAction,
  reviewRequestAction,
  cancelRequestAction,
  revokeAccessAction,
} from "./actions/requests";

// Data fetchers — SERVER ONLY. Import only from server components/pages.
// Do not import these into client components or client-side code.
export {
  getMyRequestForResource,
  getPendingRequestsForResource,
  getResolvedRequestsForResource,
  getApprovalRequestById,
} from "./actions/data";

// Cache invalidation helpers — server-only
export {
  invalidateRequesterView,
  invalidatePendingApprovals,
  invalidateResolvedApprovals,
  invalidateApprovalRequestDetail,
  revalidateHelpersPage,
} from "./cache";

// Components
export { ApprovalMenuTrigger } from "./components/approval-menu-trigger";

// Types
export type { ApprovalActionState, ResolvedRequest } from "./lib/types";
