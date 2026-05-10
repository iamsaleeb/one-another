import { NotificationType } from '@prisma/client'

const mockQueueNotification = jest.fn().mockResolvedValue(undefined)
const mockCancelManyNotifications = jest.fn().mockResolvedValue(undefined)
const mockScheduleEventReminderNotification = jest.fn().mockResolvedValue(undefined)
const mockRescheduleEventReminderNotifications = jest.fn().mockResolvedValue(undefined)

jest.mock('@/lib/db', () => ({
  prisma: {
    event: { findUnique: jest.fn(), update: jest.fn() },
    eventAttendee: { findMany: jest.fn() },
    seriesFollower: { findMany: jest.fn() },
    notification: { upsert: jest.fn(), createMany: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    notificationPreference: { findMany: jest.fn() },
  },
}))

jest.mock('@/lib/notifications/queue', () => ({
  scheduleEventReminderNotification: mockScheduleEventReminderNotification,
  rescheduleEventReminderNotifications: mockRescheduleEventReminderNotifications,
  cancelManyNotifications: mockCancelManyNotifications,
  queueNotification: mockQueueNotification,
}))

jest.mock('@/lib/permissions', () => ({
  canManageChurch: jest.fn().mockResolvedValue(true),
}))

jest.mock('@/lib/dal/questions', () => ({
  syncEventQuestions: jest.fn().mockResolvedValue(undefined),
}))

import { prisma } from '@/lib/db'
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('notifySeriesFollowers deduplication', () => {
  beforeEach(() => jest.clearAllMocks())

  it('upserts NEW_SERIES_SESSION rather than creating duplicates', async () => {
    const { publishEvent } = require('../events')

    ;(mockPrisma.event.findUnique as jest.Mock).mockResolvedValue({
      id: 'evt-1',
      churchId: 'ch-1',
      seriesId: 'series-1',
      title: 'Sunday Service',
      isDraft: true,
      datetime: new Date(Date.now() + 86400000),
    })
    ;(mockPrisma.event.update as jest.Mock).mockResolvedValue({})
    ;(mockPrisma.eventAttendee.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.seriesFollower.findMany as jest.Mock).mockResolvedValue([
      { userId: 'user-1' },
      { userId: 'user-2' },
    ])

    await publishEvent('evt-1', 'admin-user', 'ADMIN')

    // Should use queueNotification (dedup path), NOT createMany
    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled()
    expect(mockQueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.NEW_SERIES_SESSION,
        dedupeKey: 'series-1:evt-1',
        userId: 'user-1',
      })
    )
    expect(mockQueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.NEW_SERIES_SESSION,
        dedupeKey: 'series-1:evt-1',
        userId: 'user-2',
      })
    )
  })
})

describe('notifyEventAttendees deduplication', () => {
  beforeEach(() => jest.clearAllMocks())

  it('upserts EVENT_CANCELLED rather than creating duplicates', async () => {
    const { cancelEvent } = require('../events')

    ;(mockPrisma.event.findUnique as jest.Mock).mockResolvedValue({
      id: 'evt-2',
      churchId: 'ch-1',
      seriesId: null,
      title: 'Friday Night',
    })
    ;(mockPrisma.event.update as jest.Mock).mockResolvedValue({})
    ;(mockPrisma.eventAttendee.findMany as jest.Mock).mockResolvedValue([
      { userId: 'user-3' },
      { userId: 'user-4' },
    ])

    await cancelEvent('evt-2', 'Venue unavailable', 'admin-user', 'ADMIN')

    // Should use queueNotification (dedup path), NOT createMany
    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled()
    expect(mockQueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.EVENT_CANCELLED,
        dedupeKey: 'cancelled:evt-2',
        userId: 'user-3',
      })
    )
    expect(mockQueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: NotificationType.EVENT_CANCELLED,
        dedupeKey: 'cancelled:evt-2',
        userId: 'user-4',
      })
    )
  })
})
