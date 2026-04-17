jest.mock('next/cache', () => ({
  updateTag: jest.fn(),
}))

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}))

import { completeOnboardingAction, skipOnboardingAction } from '@/lib/actions/onboarding'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { updateTag } from 'next/cache'

const mockAuth = auth as jest.Mock
const mockUpdate = prisma.user.update as jest.Mock
const mockUpdateTag = updateTag as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

// ──────────────────────────────────────────────────────────────────────────────
// completeOnboardingAction

describe('completeOnboardingAction', () => {
  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await completeOnboardingAction({})
    expect(result).toEqual({ error: 'You must be logged in.' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns error when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: {} })
    const result = await completeOnboardingAction({})
    expect(result).toEqual({ error: 'You must be logged in.' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('saves all fields, invalidates user cache, and returns {} on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUpdate.mockResolvedValue({})

    const result = await completeOnboardingAction({
      phone: '0412345678',
      dateOfBirth: '1990-05-15',
      image: 'https://example.com/photo.jpg',
    })

    expect(result).toEqual({})
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        phone: '0412345678',
        dateOfBirth: new Date('1990-05-15T12:00:00.000Z'),
        image: 'https://example.com/photo.jpg',
        onboardingCompleted: true,
      },
    })
    expect(mockUpdateTag).toHaveBeenCalledWith('user-user-1')
  })

  it('stores null for missing phone, dateOfBirth and image', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUpdate.mockResolvedValue({})

    await completeOnboardingAction({})

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        phone: null,
        dateOfBirth: null,
        image: null,
        onboardingCompleted: true,
      },
    })
  })

  it('returns fieldErrors for an invalid image URL', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const result = await completeOnboardingAction({ image: 'not-a-url' })

    expect(result.fieldErrors?.image).toBeDefined()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns fieldErrors for a future dateOfBirth', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    const future = new Date()
    future.setFullYear(future.getFullYear() + 1)

    const result = await completeOnboardingAction({
      dateOfBirth: future.toISOString().split('T')[0],
    })

    expect(result.fieldErrors?.dateOfBirth).toBeDefined()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns fieldErrors for an invalid date format', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })

    const result = await completeOnboardingAction({ dateOfBirth: '15-05-1990' })

    expect(result.fieldErrors?.dateOfBirth).toBeDefined()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('normalises dateOfBirth to noon UTC to avoid timezone day shifts', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUpdate.mockResolvedValue({})

    await completeOnboardingAction({ dateOfBirth: '2000-01-15' })

    const saved = mockUpdate.mock.calls[0][0].data.dateOfBirth as Date
    expect(saved.toISOString()).toBe('2000-01-15T12:00:00.000Z')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// skipOnboardingAction

describe('skipOnboardingAction', () => {
  it('returns error when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const result = await skipOnboardingAction()
    expect(result).toEqual({ error: 'You must be logged in.' })
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('marks onboardingCompleted and returns {} on success', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockUpdate.mockResolvedValue({})

    const result = await skipOnboardingAction()

    expect(result).toEqual({})
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { onboardingCompleted: true },
    })
  })
})
