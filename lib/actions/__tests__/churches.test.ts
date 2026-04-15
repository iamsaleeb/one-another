jest.mock('next/cache', () => ({
  updateTag: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    churchFollower: {
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

import { updateTag } from 'next/cache'
import { followChurchAction, unfollowChurchAction } from '@/lib/actions/churches'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'

const mockUpdateTag = updateTag as jest.Mock
const mockChurchFollowerCreate = prisma.churchFollower.create as jest.Mock
const mockChurchFollowerDelete = prisma.churchFollower.delete as jest.Mock
const mockAuth = auth as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
})

describe('followChurchAction', () => {
  it('creates a ChurchFollower and invalidates the church tag', async () => {
    mockChurchFollowerCreate.mockResolvedValue({})
    await followChurchAction('ch-1')
    expect(mockChurchFollowerCreate).toHaveBeenCalledWith({
      data: { churchId: 'ch-1', userId: 'user-1' },
    })
    expect(mockUpdateTag).toHaveBeenCalledWith('church-ch-1')
  })

  it('returns an error when the user is not signed in', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await followChurchAction('ch-1')
    expect(result.error).toBeDefined()
    expect(mockChurchFollowerCreate).not.toHaveBeenCalled()
  })
})

describe('unfollowChurchAction', () => {
  it('deletes the ChurchFollower and invalidates the church tag', async () => {
    mockChurchFollowerDelete.mockResolvedValue({})
    await unfollowChurchAction('ch-1')
    expect(mockChurchFollowerDelete).toHaveBeenCalledWith({
      where: { churchId_userId: { churchId: 'ch-1', userId: 'user-1' } },
    })
    expect(mockUpdateTag).toHaveBeenCalledWith('church-ch-1')
  })

  it('returns an error when the user is not signed in', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await unfollowChurchAction('ch-1')
    expect(result.error).toBeDefined()
    expect(mockChurchFollowerDelete).not.toHaveBeenCalled()
  })
})
