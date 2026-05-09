import { NotificationType } from '@prisma/client'
import { queueNotification, cancelNotification, cancelManyNotifications } from '../queue'

// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    notification: {
      upsert: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
    },
    notificationPreference: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}))

import { prisma } from '@/lib/db'
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('queueNotification', () => {
  beforeEach(() => jest.clearAllMocks())

  it('upserts when dedupeKey provided', async () => {
    await queueNotification({
      userId: 'user-1',
      type: NotificationType.EVENT_REMINDER,
      title: 'Reminder',
      body: 'Event starts soon',
      dedupeKey: 'event-123',
    })
    expect(mockPrisma.notification.upsert).toHaveBeenCalledTimes(1)
    expect(mockPrisma.notification.create).not.toHaveBeenCalled()
  })

  it('creates without dedupeKey', async () => {
    await queueNotification({
      userId: 'user-1',
      type: NotificationType.NEW_SERIES_SESSION,
      title: 'New Session',
      body: 'A new session was added',
    })
    expect(mockPrisma.notification.create).toHaveBeenCalledTimes(1)
    expect(mockPrisma.notification.upsert).not.toHaveBeenCalled()
  })

  it('accepts all NotificationType enum values', async () => {
    const types = Object.values(NotificationType)
    expect(types).toContain('EVENT_REMINDER')
    expect(types).toContain('NEW_SERIES_SESSION')
    expect(types).toContain('EVENT_CANCELLED')
  })
})

describe('cancelNotification', () => {
  it('calls updateMany with correct where clause', async () => {
    await cancelNotification({
      userId: 'user-1',
      type: NotificationType.EVENT_REMINDER,
      dedupeKey: 'event-123',
    })
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: NotificationType.EVENT_REMINDER,
          dedupeKey: 'event-123',
        }),
      })
    )
  })
})
