import { ChurchRole, EventRole } from '@prisma/client'
import type { Capability } from './capabilities'

export const CHURCH_ROLE_CAPABILITIES = {
  CHURCH_ADMIN: [
    'church:manage',
    'church:manage_members',
    'event:create',
    'event:update',
    'event:publish',
    'event:delete',
    'event:manage_staff',
    'event:view_attendees',
    'event:scan_attendees',
  ],
  EVENT_MANAGER: [
    'event:create',
    'event:update',
    'event:publish',
    'event:delete',
    'event:manage_staff',
    'event:view_attendees',
    'event:scan_attendees',
  ],
  EVENT_CREATOR: [
    'event:create',
    'event:update',
  ],
} satisfies Record<ChurchRole, Capability[]>

export const EVENT_ROLE_CAPABILITIES = {
  EVENT_MANAGER: [
    'event:update',
    'event:manage_staff',
    'event:view_attendees',
    'event:scan_attendees',
  ],
  EVENT_EDITOR: [
    'event:update',
  ],
} satisfies Record<EventRole, Capability[]>
