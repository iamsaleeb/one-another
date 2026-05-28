jest.mock('server-only', () => ({}))
jest.mock('@/auth', () => ({ auth: jest.fn() }))
jest.mock('@/domains/roles/lib/session', () => ({ sessionToClaims: jest.fn() }))
jest.mock('@/domains/roles/policies/event', () => ({
  eventPolicy: { canManageStaff: jest.fn() },
}))
jest.mock('@/domains/roles/dal/event-staff', () => ({
  upsertEventStaff: jest.fn(),
  removeEventStaff: jest.fn(),
}))

import { assignEventRoleAction, removeEventStaffAction } from '../event-staff'
import { auth } from '@/auth'
import { sessionToClaims } from '@/domains/roles/lib/session'
import { eventPolicy } from '@/domains/roles/policies/event'
import { upsertEventStaff, removeEventStaff } from '@/domains/roles/dal/event-staff'

const mockAuth = auth as jest.Mock
const mockSessionToClaims = sessionToClaims as jest.Mock
const mockCanManageStaff = eventPolicy.canManageStaff as jest.Mock
const mockUpsert = upsertEventStaff as jest.Mock
const mockRemove = removeEventStaff as jest.Mock

const validSession = { user: { id: 'admin-1' } }
const validClaims = { isPlatformAdmin: true, churchMemberships: [] }

describe('assignEventRoleAction', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    mockSessionToClaims.mockReturnValue(null)
    const result = await assignEventRoleAction({ userId: 'u1', eventId: 'e1', role: 'EVENT_EDITOR', churchId: 'c1' })
    expect(result).toEqual({ error: 'Unauthorised.' })
  })

  it('returns error when not authorized to manage staff', async () => {
    mockAuth.mockResolvedValue(validSession)
    mockSessionToClaims.mockReturnValue(validClaims)
    mockCanManageStaff.mockReturnValue(false)
    const result = await assignEventRoleAction({ userId: 'u1', eventId: 'e1', role: 'EVENT_EDITOR', churchId: 'c1' })
    expect(result).toEqual({ error: 'Unauthorised.' })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('assigns event role when authorized', async () => {
    mockAuth.mockResolvedValue(validSession)
    mockSessionToClaims.mockReturnValue(validClaims)
    mockCanManageStaff.mockReturnValue(true)
    mockUpsert.mockResolvedValue({})
    const result = await assignEventRoleAction({ userId: 'u1', eventId: 'e1', role: 'EVENT_EDITOR', churchId: 'c1' })
    expect(result).toEqual({ success: 'Staff role assigned.' })
    expect(mockUpsert).toHaveBeenCalledWith('u1', 'e1', 'EVENT_EDITOR', 'admin-1')
  })
})
