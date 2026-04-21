jest.mock('@/lib/db', () => ({
  prisma: {
    notification: {
      upsert: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  },
}))

import { prisma } from '@/lib/db'
import {
  queueNotification,
  cancelNotification,
  cancelManyNotifications,
  rescheduleNotification,
  scheduleEventReminderNotification,
  rescheduleEventReminderNotifications,
  updateUserReminderSchedule,
} from '@/lib/notifications/queue'

const mockUpsert = prisma.notification.upsert as jest.Mock
const mockCreate = prisma.notification.create as jest.Mock
const mockUpdate = prisma.notification.update as jest.Mock
const mockUpdateMany = prisma.notification.updateMany as jest.Mock
const mockFindMany = prisma.notification.findMany as jest.Mock
const mockPrefFindUnique = prisma.notificationPreference.findUnique as jest.Mock
const mockPrefFindMany = prisma.notificationPreference.findMany as jest.Mock

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

describe('scheduleEventReminderNotification', () => {
  const futureEvent = {
    id: 'ev-1',
    title: 'Sunday Service',
    datetime: new Date(Date.now() + 10 * 3_600_000), // 10 hours from now
  }

  it('upserts reminder using default 2h offset when no preference stored', async () => {
    mockPrefFindUnique.mockResolvedValue(null)
    mockUpsert.mockResolvedValue({ id: 'n-1' })

    await scheduleEventReminderNotification('u-1', futureEvent)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_type_dedupeKey: { userId: 'u-1', type: 'EVENT_REMINDER', dedupeKey: 'ev-1' } },
        create: expect.objectContaining({
          body: 'Sunday Service starts in 2 hours',
          data: expect.objectContaining({ eventId: 'ev-1', eventTitle: 'Sunday Service' }),
        }),
      })
    )
  })

  it('uses hoursBeforeEvent from stored preference', async () => {
    mockPrefFindUnique.mockResolvedValue({ config: { hoursBeforeEvent: 4 } })
    mockUpsert.mockResolvedValue({ id: 'n-1' })

    await scheduleEventReminderNotification('u-1', futureEvent)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ body: 'Sunday Service starts in 4 hours' }),
      })
    )
  })

  it('skips scheduling when scheduledFor is in the past', async () => {
    mockPrefFindUnique.mockResolvedValue(null)
    const pastEvent = { id: 'ev-2', title: 'Past Event', datetime: new Date(Date.now() + 1_000) }

    await scheduleEventReminderNotification('u-1', pastEvent)

    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('uses singular "1 hour" body when hoursBeforeEvent is 1', async () => {
    mockPrefFindUnique.mockResolvedValue({ config: { hoursBeforeEvent: 1 } })
    mockUpsert.mockResolvedValue({ id: 'n-1' })

    await scheduleEventReminderNotification('u-1', futureEvent)

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ body: 'Sunday Service starts in 1 hour' }),
      })
    )
  })
})

describe('rescheduleEventReminderNotifications', () => {
  it('updates each pending notification with per-user hours preference', async () => {
    const newDatetime = new Date(Date.now() + 12 * 3_600_000)
    mockFindMany.mockResolvedValue([
      { id: 'n-1', userId: 'u-1', data: { eventTitle: 'Sunday Service', eventDatetime: new Date().toISOString() } },
      { id: 'n-2', userId: 'u-2', data: { eventTitle: 'Sunday Service', eventDatetime: new Date().toISOString() } },
    ])
    mockPrefFindMany.mockResolvedValue([
      { userId: 'u-1', config: { hoursBeforeEvent: 4 } },
    ])
    mockUpdate.mockResolvedValue({})

    await rescheduleEventReminderNotifications('ev-1', newDatetime)

    expect(mockUpdate).toHaveBeenCalledTimes(2)
    // u-1 uses 4h preference
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'n-1' },
        data: expect.objectContaining({ body: 'Sunday Service starts in 4 hours' }),
      })
    )
    // u-2 falls back to default 2h
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'n-2' },
        data: expect.objectContaining({ body: 'Sunday Service starts in 2 hours' }),
      })
    )
  })

  it('no-ops when no pending notifications exist', async () => {
    mockFindMany.mockResolvedValue([])

    await rescheduleEventReminderNotifications('ev-1', new Date())

    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

describe('updateUserReminderSchedule', () => {
  it('updates body and scheduledFor for each future pending reminder', async () => {
    const futureEventDatetime = new Date(Date.now() + 10 * 3_600_000).toISOString()
    mockFindMany.mockResolvedValue([
      { id: 'n-1', data: { eventTitle: 'Morning Prayer', eventDatetime: futureEventDatetime } },
    ])
    mockUpdate.mockResolvedValue({})

    await updateUserReminderSchedule('u-1', 3)

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'n-1' },
        data: expect.objectContaining({ body: 'Morning Prayer starts in 3 hours' }),
      })
    )
  })

  it('skips reminders where new scheduledFor would be in the past', async () => {
    const nearFutureDatetime = new Date(Date.now() + 1 * 3_600_000).toISOString() // 1h from now
    mockFindMany.mockResolvedValue([
      { id: 'n-1', data: { eventTitle: 'Soon Event', eventDatetime: nearFutureDatetime } },
    ])

    await updateUserReminderSchedule('u-1', 4) // 4h offset > 1h until event → in the past

    expect(mockUpdate).not.toHaveBeenCalled()
  })
})
