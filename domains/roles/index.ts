// Actions
export * from "./actions/church-memberships";
export * from "./actions/event-staff";
export * from "./actions/series-staff";
export * from "./actions/platform-roles";

// Validations + inferred types
export * from "./validations/roles";

// Permissions (CASL Ability built from DB-loaded Grants; see ADR 0001)
export {
  buildAbility,
  hasAnyGrant,
  eventSubject,
  seriesSubject,
  churchSubject,
} from "./lib/ability";
export type { Action, AppAbility } from "./lib/ability";
export { getAbility, getSessionUserId } from "./lib/get-ability";
export { getChurchTargets } from "./lib/scopes";
export type { Grants } from "./lib/grants";

export type { RoleActionState } from "./lib/types";
