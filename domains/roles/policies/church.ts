import { can, type Actor } from "../lib/can";
import { Capabilities } from "../lib/capabilities";

export const churchPolicy = {
  canManage: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.CHURCH_MANAGE, { churchId }),
  canManageMembers: (actor: Actor, churchId: string) =>
    can(actor, Capabilities.CHURCH_MANAGE_MEMBERS, { churchId }),
};
