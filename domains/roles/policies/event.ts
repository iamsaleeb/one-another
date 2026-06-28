import type { Actor } from "../lib/actor";
import { Capabilities } from "../lib/capabilities";

export const eventPolicy = {
  canCreate: (actor: Actor, churchId: string) =>
    actor.can(Capabilities.EVENT_CREATE, { churchId }),
  canPublish: (actor: Actor, churchId: string) =>
    actor.can(Capabilities.EVENT_PUBLISH, { churchId }),
  canDelete: (actor: Actor, churchId: string) =>
    actor.can(Capabilities.EVENT_DELETE, { churchId }),
};
