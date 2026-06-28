import type { Actor } from "../lib/actor";
import { Capabilities } from "../lib/capabilities";

export const seriesPolicy = {
  canCreate: (actor: Actor, churchId: string) =>
    actor.can(Capabilities.SERIES_CREATE, { churchId }),
  canUpdate: (actor: Actor, churchId: string) =>
    actor.can(Capabilities.SERIES_UPDATE, { churchId }),
  canDelete: (actor: Actor, churchId: string) =>
    actor.can(Capabilities.SERIES_DELETE, { churchId }),
  canAddSession: (actor: Actor, churchId: string) =>
    actor.can(Capabilities.EVENT_CREATE, { churchId }),
};
