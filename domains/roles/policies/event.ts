import { can } from '../lib/can'
import { Capabilities } from '../lib/capabilities'
import type { RoleClaims } from '../lib/types'

export const eventPolicy = {
  canCreate: (claims: RoleClaims, churchId: string) =>
    can(claims, Capabilities.EVENT_CREATE, { scope: 'CHURCH', churchId }),
  canEdit: (claims: RoleClaims, eventId: string, churchId: string) =>
    can(claims, Capabilities.EVENT_UPDATE, { scope: 'EVENT', eventId, churchId }),
  canPublish: (claims: RoleClaims, churchId: string) =>
    can(claims, Capabilities.EVENT_PUBLISH, { scope: 'CHURCH', churchId }),
  canDelete: (claims: RoleClaims, churchId: string) =>
    can(claims, Capabilities.EVENT_DELETE, { scope: 'CHURCH', churchId }),
  canManageStaff: (claims: RoleClaims, eventId: string, churchId: string) =>
    can(claims, Capabilities.EVENT_MANAGE_STAFF, { scope: 'EVENT', eventId, churchId }),
  canViewAttendees: (claims: RoleClaims, eventId: string, churchId: string) =>
    can(claims, Capabilities.EVENT_VIEW_ATTENDEES, { scope: 'EVENT', eventId, churchId }),
  canScanAttendees: (claims: RoleClaims, eventId: string, churchId: string) =>
    can(claims, Capabilities.EVENT_SCAN_ATTENDEES, { scope: 'EVENT', eventId, churchId }),
}
