import { can } from "../lib/can";
import { Capabilities } from "../lib/capabilities";
import type { Actor } from "../lib/can";

export const eventPolicy = {
  canCreate: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.EVENT_CREATE, { churchId }),
  canPublish: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.EVENT_PUBLISH, { churchId }),
  canDelete: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.EVENT_DELETE, { churchId }),
};
