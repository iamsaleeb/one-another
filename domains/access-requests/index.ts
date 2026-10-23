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
  getAccessRequestById,
} from "./actions/data";

// Components
export { AccessMenuTrigger } from "./components/access-menu-trigger";

// Types
export type { AccessRequestActionState } from "./lib/types";
