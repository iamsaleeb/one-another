jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    series: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    seriesFollower: {
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/permissions', () => ({
  canManageChurch: jest.fn(),
}))

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createSeriesAction, followSeriesAction, unfollowSeriesAction } from '@/lib/actions/series'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { canManageChurch } from '@/lib/permissions'

const mockRedirect = redirect as unknown as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock
const mockSeriesCreate = prisma.series.create as jest.Mock
const mockSeriesFollowerCreate = prisma.seriesFollower.create as jest.Mock
const mockSeriesFollowerDelete = prisma.seriesFollower.delete as jest.Mock
const mockAuth = auth as jest.Mock
const mockCanManageChurch = canManageChurch as jest.Mock

const validData = {
  name: 'Weekly Bible Study',
  description: 'A weekly deep dive into scripture',
  cadence: 'WEEKLY' as const,
  location: 'Room 101',
  host: 'Pastor John',
  tag: 'Bible Study',
  churchId: 'ch-1',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ORGANISER' } })
  mockCanManageChurch.mockResolvedValue(true)
})

describe('createSeriesAction', () => {
  it('creates a series and redirects to its detail page', async () => {
    mockSeriesCreate.mockResolvedValue({ id: 'ser-1', ...validData })

    await createSeriesAction(validData)

    expect(mockSeriesCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Weekly Bible Study',
        cadence: 'WEEKLY',
        location: 'Room 101',
        host: 'Pastor John',
        tag: 'Bible Study',
        churchId: 'ch-1',
      }),
    })
    expect(mockRedirect).toHaveBeenCalledWith('/series/ser-1')
  })

  it('includes churchId in the create call when provided', async () => {
    mockSeriesCreate.mockResolvedValue({ id: 'ser-2', ...validData, churchId: 'ch-99' })

    await createSeriesAction({ ...validData, churchId: 'ch-99' })

    expect(mockSeriesCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ churchId: 'ch-99' }),
    })
  })

  it('returns fieldErrors when required fields are missing', async () => {
    const result = await createSeriesAction({ ...validData, name: '' })

    expect(result.fieldErrors).toBeDefined()
    expect(result.fieldErrors?.name).toBeDefined()
    expect(mockSeriesCreate).not.toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('returns a fieldError for an invalid cadence value', async () => {
    const result = await createSeriesAction({
      ...validData,
      cadence: 'DAILY' as 'WEEKLY',
    })

    expect(result.fieldErrors?.cadence).toBeDefined()
    expect(mockSeriesCreate).not.toHaveBeenCalled()
  })

  it('returns a fieldError when churchId is empty', async () => {
    const result = await createSeriesAction({ ...validData, churchId: '' })

    expect(result.fieldErrors?.churchId).toBeDefined()
    expect(mockSeriesCreate).not.toHaveBeenCalled()
  })

  it('returns an unauthorized error when there is no session', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await createSeriesAction(validData)

    expect(result.error).toBeDefined()
    expect(mockSeriesCreate).not.toHaveBeenCalled()
  })

  it('returns an unauthorized error when the user is not an organiser', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ATTENDEE' } })

    const result = await createSeriesAction(validData)

    expect(result.error).toBeDefined()
    expect(mockSeriesCreate).not.toHaveBeenCalled()
  })

  it('returns an error when organiser is not assigned to the church', async () => {
    mockCanManageChurch.mockResolvedValue(false)

    const result = await createSeriesAction(validData)

    expect(result.error).toBe('You are not assigned to this church.')
    expect(mockSeriesCreate).not.toHaveBeenCalled()
  })
})

describe('followSeriesAction', () => {
  it('creates a series follower record and revalidates the path', async () => {
    mockSeriesFollowerCreate.mockResolvedValue({})

    await followSeriesAction('ser-1')

    expect(mockSeriesFollowerCreate).toHaveBeenCalledWith({
      data: { seriesId: 'ser-1', userId: 'user-1' },
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/series/ser-1')
  })

  it('does nothing when there is no session', async () => {
    mockAuth.mockResolvedValue(null)

    await followSeriesAction('ser-1')

    expect(mockSeriesFollowerCreate).not.toHaveBeenCalled()
  })
})

describe('unfollowSeriesAction', () => {
  it('deletes the series follower record and revalidates the path', async () => {
    mockSeriesFollowerDelete.mockResolvedValue({})

    await unfollowSeriesAction('ser-1')

    expect(mockSeriesFollowerDelete).toHaveBeenCalledWith({
      where: { seriesId_userId: { seriesId: 'ser-1', userId: 'user-1' } },
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/series/ser-1')
  })

  it('does nothing when there is no session', async () => {
    mockAuth.mockResolvedValue(null)

    await unfollowSeriesAction('ser-1')

    expect(mockSeriesFollowerDelete).not.toHaveBeenCalled()
  })
})
