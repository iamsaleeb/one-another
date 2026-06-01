// domains/approvals/index.ts

// Server actions — importable from client components
export { submitRequestAction, reviewRequestAction } from "./actions/requests";

// Data fetching — server-only, for use in server components/pages
export {
  getMyRequestForResource,
  getPendingRequestsForResource,
} from "./actions/data";

// Components
export { ApprovalMenuTrigger } from "./components/approval-menu-trigger";
export { PendingRequestsCard } from "./components/pending-requests-card";

// Types
export type { ApprovalActionState } from "./lib/types";
