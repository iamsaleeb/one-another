import { can } from '../lib/can'
import { Capabilities } from '../lib/capabilities'
import type { RoleClaims } from '../lib/types'

export const churchPolicy = {
  canManage: (claims: RoleClaims, churchId: string) =>
    can(claims, Capabilities.CHURCH_MANAGE, { scope: 'CHURCH', churchId }),
  canManageMembers: (claims: RoleClaims, churchId: string) =>
    can(claims, Capabilities.CHURCH_MANAGE_MEMBERS, { scope: 'CHURCH', churchId }),
}
