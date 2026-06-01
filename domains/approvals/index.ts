// Server actions — importable from client components
export {
  submitRequestAction,
  reviewRequestAction,
  cancelRequestAction,
  revokeAccessAction,
} from "./actions/requests";

// Data fetching — server-only, for use in server components/pages
export {
  getMyRequestForResource,
  getPendingRequestsForResource,
  getAllRequestsForResource,
} from "./actions/data";

// Components
export { ApprovalMenuTrigger } from "./components/approval-menu-trigger";

// Types
export type { ApprovalActionState, ResolvedRequest } from "./lib/types";
