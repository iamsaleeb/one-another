// Permissions (CASL Ability built from DB-loaded Grants; see ADR 0001)
export {
  hasAnyGrant,
  eventSubject,
  seriesSubject,
  churchSubject,
} from "./lib/ability";
export type { Action, AppAbility } from "./lib/ability";
export { getAbility, getSessionUserId } from "./lib/get-ability";
export { getChurchTargets } from "./lib/scopes";
export type { Grants } from "./lib/grants";
