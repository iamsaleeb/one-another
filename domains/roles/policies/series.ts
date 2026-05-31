import { can } from "../lib/can";
import { Capabilities } from "../lib/capabilities";
import type { Actor } from "../lib/can";

export const seriesPolicy = {
  canCreate: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.SERIES_CREATE, { churchId }),
  canUpdate: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.SERIES_UPDATE, { churchId }),
  canDelete: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.SERIES_DELETE, { churchId }),
  canAddSession: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.EVENT_CREATE, { churchId }),
};
