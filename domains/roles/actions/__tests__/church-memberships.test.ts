jest.mock('server-only', () => ({}))
jest.mock('@/auth', () => ({ auth: jest.fn() }))
jest.mock('@/domains/roles/lib/session', () => ({ sessionToClaims: jest.fn() }))
jest.mock('@/domains/roles/policies/church', () => ({
  churchPolicy: { canManageMembers: jest.fn() },
}))
jest.mock('@/domains/roles/dal/church-memberships', () => ({
  upsertChurchMembership: jest.fn(),
  removeChurchMembership: jest.fn(),
}))

import { assignChurchRoleAction, removeChurchMembershipAction } from '../church-memberships'
import { auth } from '@/auth'
import { sessionToClaims } from '@/domains/roles/lib/session'
import { churchPolicy } from '@/domains/roles/policies/church'
import { upsertChurchMembership, removeChurchMembership } from '@/domains/roles/dal/church-memberships'

const mockAuth = auth as jest.Mock
const mockSessionToClaims = sessionToClaims as jest.Mock
const mockCanManageMembers = churchPolicy.canManageMembers as jest.Mock
const mockUpsert = upsertChurchMembership as jest.Mock
const mockRemove = removeChurchMembership as jest.Mock

const validSession = { user: { id: 'admin-1' } }
const validClaims = { isPlatformAdmin: true, churchMemberships: [] }

describe('assignChurchRoleAction', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    mockSessionToClaims.mockReturnValue(null)
    const result = await assignChurchRoleAction({ userId: 'u1', churchId: 'c1', role: 'CHURCH_ADMIN' })
    expect(result).toEqual({ error: 'Unauthorised.' })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('returns error when not authorized', async () => {
    mockAuth.mockResolvedValue(validSession)
    mockSessionToClaims.mockReturnValue(validClaims)
    mockCanManageMembers.mockReturnValue(false)
    const result = await assignChurchRoleAction({ userId: 'u1', churchId: 'c1', role: 'CHURCH_ADMIN' })
    expect(result).toEqual({ error: 'Unauthorised.' })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('assigns role and returns success when authorized', async () => {
    mockAuth.mockResolvedValue(validSession)
    mockSessionToClaims.mockReturnValue(validClaims)
    mockCanManageMembers.mockReturnValue(true)
    mockUpsert.mockResolvedValue({})
    const result = await assignChurchRoleAction({ userId: 'u1', churchId: 'c1', role: 'EVENT_MANAGER' })
    expect(result).toEqual({ success: 'Role assigned.' })
    expect(mockUpsert).toHaveBeenCalledWith('u1', 'c1', 'EVENT_MANAGER', 'admin-1')
  })

  it('returns fieldErrors for invalid input', async () => {
    mockAuth.mockResolvedValue(validSession)
    mockSessionToClaims.mockReturnValue(validClaims)
    mockCanManageMembers.mockReturnValue(true)
    const result = await assignChurchRoleAction({ userId: '', churchId: 'c1', role: 'INVALID' })
    expect(result).toHaveProperty('fieldErrors')
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})

describe('removeChurchMembershipAction', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns error when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    mockSessionToClaims.mockReturnValue(null)
    const result = await removeChurchMembershipAction({ userId: 'u1', churchId: 'c1' })
    expect(result).toEqual({ error: 'Unauthorised.' })
  })

  it('removes membership when authorized', async () => {
    mockAuth.mockResolvedValue(validSession)
    mockSessionToClaims.mockReturnValue(validClaims)
    mockCanManageMembers.mockReturnValue(true)
    mockRemove.mockResolvedValue({})
    const result = await removeChurchMembershipAction({ userId: 'u1', churchId: 'c1' })
    expect(result).toEqual({ success: 'Membership removed.' })
    expect(mockRemove).toHaveBeenCalledWith('u1', 'c1')
  })
})
