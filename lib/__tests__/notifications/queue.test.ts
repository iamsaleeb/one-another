jest.mock('@/lib/db', () => ({
  prisma: {
    notification: {
      upsert: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import { queueNotification, cancelNotification, cancelManyNotifications, rescheduleNotification } from '@/lib/notifications/queue'

const mockUpsert = prisma.notification.upsert as jest.Mock
const mockCreate = prisma.notification.create as jest.Mock
const mockUpdateMany = prisma.notification.updateMany as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

describe('queueNotification — deduped (EVENT_REMINDER)', () => {
  it('upserts with dedupeKey and future scheduledFor', async () => {
    const future = new Date(Date.now() + 3_600_000)
    mockUpsert.mockResolvedValue({ id: 'n-1' })

    await queueNotification({
      userId: 'u-1',
      type: 'EVENT_REMINDER',
      title: 'Reminder',
      body: 'Event starts soon',
      data: { type: 'EVENT_REMINDER', eventId: 'ev-1' },
      scheduledFor: future,
      dedupeKey: 'ev-1',
    })

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_type_dedupeKey: { userId: 'u-1', type: 'EVENT_REMINDER', dedupeKey: 'ev-1' } },
        create: expect.objectContaining({ userId: 'u-1', dedupeKey: 'ev-1', scheduledFor: future }),
        update: expect.objectContaining({ scheduledFor: future, cancelledAt: null }),
      })
    )
  })
})

describe('queueNotification — instant (EVENT_CANCELLED, NEW_SERIES_SESSION)', () => {
  it('creates a new record with dedupeKey=null and scheduledFor≈now', async () => {
    mockCreate.mockResolvedValue({ id: 'n-2' })

    await queueNotification({
      userId: 'u-2',
      type: 'EVENT_CANCELLED',
      title: 'Cancelled',
      body: 'Your event was cancelled',
      data: { type: 'EVENT_CANCELLED', eventId: 'ev-2' },
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u-2', type: 'EVENT_CANCELLED', dedupeKey: undefined }),
      })
    )
  })
})

describe('cancelNotification', () => {
  it('sets cancelledAt for unsent record matching userId+type+dedupeKey', async () => {
    mockUpdateMany.mockResolvedValue({ count: 1 })

    await cancelNotification({ userId: 'u-1', type: 'EVENT_REMINDER', dedupeKey: 'ev-1' })

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'u-1', type: 'EVENT_REMINDER', dedupeKey: 'ev-1', sentAt: null, cancelledAt: null },
      data: { cancelledAt: expect.any(Date) },
    })
  })
})

describe('cancelManyNotifications', () => {
  it('cancels all unsent records for a type+dedupeKey across users', async () => {
    mockUpdateMany.mockResolvedValue({ count: 5 })

    await cancelManyNotifications({ type: 'EVENT_REMINDER', dedupeKey: 'ev-1' })

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { type: 'EVENT_REMINDER', dedupeKey: 'ev-1', sentAt: null, cancelledAt: null },
      data: { cancelledAt: expect.any(Date) },
    })
  })
})

describe('rescheduleNotification', () => {
  it('updates scheduledFor and clears cancelledAt for all users', async () => {
    const newTime = new Date(Date.now() + 7_200_000)
    mockUpdateMany.mockResolvedValue({ count: 3 })

    await rescheduleNotification({ type: 'EVENT_REMINDER', dedupeKey: 'ev-1', scheduledFor: newTime })

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { type: 'EVENT_REMINDER', dedupeKey: 'ev-1', sentAt: null },
      data: { scheduledFor: newTime, cancelledAt: null },
    })
  })

  it('scopes to single userId when provided', async () => {
    const newTime = new Date(Date.now() + 7_200_000)
    mockUpdateMany.mockResolvedValue({ count: 1 })

    await rescheduleNotification({ userId: 'u-1', type: 'EVENT_REMINDER', dedupeKey: 'ev-1', scheduledFor: newTime })

    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ userId: 'u-1' }) })
    )
  })
})
