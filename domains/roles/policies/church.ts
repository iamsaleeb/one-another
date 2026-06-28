import type { Actor } from "../lib/actor";
import { Capabilities } from "../lib/capabilities";

export const churchPolicy = {
  canManage: (actor: Actor, churchId: string) =>
    actor.can(Capabilities.CHURCH_MANAGE, { churchId }),
  canManageMembers: (actor: Actor, churchId: string) =>
    actor.can(Capabilities.CHURCH_MANAGE_MEMBERS, { churchId }),
};
