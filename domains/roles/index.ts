// Actions
export * from "./actions/church-memberships";
export * from "./actions/event-staff";
export * from "./actions/series-staff";
export * from "./actions/platform-roles";

// Validations + inferred types
export * from "./validations/roles";

// Policies
export { eventPolicy } from "./policies/event";
export { churchPolicy } from "./policies/church";
export { seriesPolicy } from "./policies/series";

// Core permission API
export { getActor } from "./lib/session";
export { createFakeAccess } from "./lib/actor";
export { Capabilities } from "./lib/capabilities";
export type { Capability } from "./lib/capabilities";
export type {
  Actor,
  AuthenticatedActor,
  GuestActor,
  AuthContext,
  Access,
} from "./lib/actor";
export type { RoleActionState } from "./lib/types";
