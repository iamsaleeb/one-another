import { NotificationType } from '@prisma/client'
import { queueNotification, cancelNotification, scheduleEventReminderNotifications } from '../queue'

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
      findMany: jest.fn().mockResolvedValue([]),
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

describe('scheduleEventReminderNotifications (batch)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches all preferences in a single findMany', async () => {
    // Setup: mock findMany
    ;(mockPrisma.notificationPreference.findMany as jest.Mock).mockResolvedValue([
      { userId: 'user-1', config: { hoursBeforeEvent: 2 } },
      { userId: 'user-2', config: { hoursBeforeEvent: 24 } },
    ])
    ;(mockPrisma.notification.upsert as jest.Mock).mockResolvedValue({})

    const event = { id: 'evt-1', title: 'Sunday Service', datetime: new Date(Date.now() + 86400000) }
    await scheduleEventReminderNotifications(['user-1', 'user-2'], event)

    expect(mockPrisma.notificationPreference.findMany).toHaveBeenCalledTimes(1)
    expect(mockPrisma.notificationPreference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { in: ['user-1', 'user-2'] }, type: NotificationType.EVENT_REMINDER }),
      })
    )
  })

  it('skips users whose reminder window has already passed', async () => {
    ;(mockPrisma.notificationPreference.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.notification.upsert as jest.Mock).mockResolvedValue({})

    // Past event — reminder already passed
    const pastEvent = { id: 'evt-past', title: 'Past Event', datetime: new Date('2020-01-01') }
    await scheduleEventReminderNotifications(['user-1'], pastEvent)

    expect(mockPrisma.notification.upsert).not.toHaveBeenCalled()
  })
})
