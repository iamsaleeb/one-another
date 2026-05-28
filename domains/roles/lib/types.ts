import type { ChurchRole } from '@prisma/client'

export type ScopeContext =
  | { scope: 'PLATFORM' }
  | { scope: 'CHURCH'; churchId: string }
  | { scope: 'EVENT'; eventId: string; churchId: string }

export interface RoleClaims {
  isPlatformAdmin: boolean
  churchMemberships: { churchId: string; role: ChurchRole }[]
}
