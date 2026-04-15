jest.mock('next/cache', () => ({
  updateTag: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    churchOrganiser: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/permissions', () => ({
  isAdminForChurch: jest.fn(),
}))

import { updateTag } from 'next/cache'
import { addOrganiserToChurchAction, removeOrganiserFromChurchAction } from '@/lib/actions/admin'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { isAdminForChurch } from '@/lib/permissions'

const mockUpdateTag = updateTag as jest.Mock
const mockAuth = auth as jest.Mock
const mockIsAdminForChurch = isAdminForChurch as jest.Mock
const mockUserFindUnique = prisma.user.findUnique as jest.Mock
const mockChurchOrganiserFindUnique = prisma.churchOrganiser.findUnique as jest.Mock
const mockChurchOrganiserDelete = prisma.churchOrganiser.delete as jest.Mock
const mockChurchOrganiserCount = prisma.churchOrganiser.count as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  return fd
}

const adminSession = { user: { id: 'admin-1', role: 'ADMIN' } }

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue(adminSession)
  mockIsAdminForChurch.mockResolvedValue(true)
})

describe('addOrganiserToChurchAction', () => {
  it('returns an error when the user is not an admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ORGANISER' } })

    const result = await addOrganiserToChurchAction({}, makeFormData({ churchId: 'ch-1', email: 'x@example.com' }))

    expect(result.error).toBeDefined()
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns an error when churchId or email is missing', async () => {
    const result = await addOrganiserToChurchAction({}, makeFormData({ churchId: 'ch-1' }))
    expect(result.error).toBeDefined()
  })

  it('returns an error when admin is not assigned to the church', async () => {
    mockIsAdminForChurch.mockResolvedValue(false)

    const result = await addOrganiserToChurchAction(
      {},
      makeFormData({ churchId: 'ch-1', email: 'org@example.com' })
    )

    expect(result.error).toBeDefined()
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns an error when no account is found with that email', async () => {
    mockUserFindUnique.mockResolvedValue(null)

    const result = await addOrganiserToChurchAction(
      {},
      makeFormData({ churchId: 'ch-1', email: 'nobody@example.com' })
    )

    expect(result.error).toMatch(/no account/i)
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns an error when the target user is an admin', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-2', role: 'ADMIN' })

    const result = await addOrganiserToChurchAction(
      {},
      makeFormData({ churchId: 'ch-1', email: 'admin2@example.com' })
    )

    expect(result.error).toBeDefined()
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('returns success without creating if user is already an organiser for this church', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-2', role: 'ORGANISER' })
    mockChurchOrganiserFindUnique.mockResolvedValue({ userId: 'user-2' })

    const result = await addOrganiserToChurchAction(
      {},
      makeFormData({ churchId: 'ch-1', email: 'existing@example.com' })
    )

    expect(result.success).toBeDefined()
    expect(mockTransaction).not.toHaveBeenCalled()
  })

  it('runs a transaction and invalidates cache tags on success', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'user-2', role: 'ORGANISER' })
    mockChurchOrganiserFindUnique.mockResolvedValue(null)
    mockTransaction.mockResolvedValue(undefined)

    const result = await addOrganiserToChurchAction(
      {},
      makeFormData({ churchId: 'ch-1', email: 'new@example.com' })
    )

    expect(mockTransaction).toHaveBeenCalled()
    expect(mockUpdateTag).toHaveBeenCalledWith('churches')
    expect(result.success).toBeDefined()
  })
})

describe('removeOrganiserFromChurchAction', () => {
  it('returns an error when the user is not an admin', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ATTENDEE' } })

    const result = await removeOrganiserFromChurchAction(
      {},
      makeFormData({ churchId: 'ch-1', targetUserId: 'user-2' })
    )

    expect(result.error).toBeDefined()
    expect(mockChurchOrganiserDelete).not.toHaveBeenCalled()
  })

  it('returns an error when admin is not assigned to the church', async () => {
    mockIsAdminForChurch.mockResolvedValue(false)

    const result = await removeOrganiserFromChurchAction(
      {},
      makeFormData({ churchId: 'ch-1', targetUserId: 'user-2' })
    )

    expect(result.error).toBeDefined()
    expect(mockChurchOrganiserDelete).not.toHaveBeenCalled()
  })

  it('deletes the record, invalidates cache tags, and returns success', async () => {
    mockChurchOrganiserDelete.mockResolvedValue({})
    mockChurchOrganiserCount.mockResolvedValue(1)

    const result = await removeOrganiserFromChurchAction(
      {},
      makeFormData({ churchId: 'ch-1', targetUserId: 'user-2' })
    )

    expect(mockChurchOrganiserDelete).toHaveBeenCalledWith({
      where: { userId_churchId: { userId: 'user-2', churchId: 'ch-1' } },
    })
    expect(mockUpdateTag).toHaveBeenCalledWith('churches')
    expect(result.success).toBeDefined()
  })

  it('downgrades the user to ATTENDEE when they have no remaining church assignments', async () => {
    mockChurchOrganiserDelete.mockResolvedValue({})
    mockChurchOrganiserCount.mockResolvedValue(0)
    const mockUserUpdate = prisma.user.update as jest.Mock

    await removeOrganiserFromChurchAction(
      {},
      makeFormData({ churchId: 'ch-1', targetUserId: 'user-2' })
    )

    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: { role: 'ATTENDEE' },
    })
  })

  it('returns an error when required fields are missing', async () => {
    const result = await removeOrganiserFromChurchAction(
      {},
      makeFormData({ churchId: 'ch-1' })
    )

    expect(result.error).toBeDefined()
    expect(mockChurchOrganiserDelete).not.toHaveBeenCalled()
  })
})
