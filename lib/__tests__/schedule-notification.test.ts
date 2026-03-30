jest.mock('@/lib/db', () => ({
  prisma: {
    notificationPreference: {
      findUnique: jest.fn(),
    },
    scheduledNotification: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'
import {
  scheduleEventReminder,
  cancelEventReminder,
  cancelAllRemindersForEvent,
  rescheduleEventReminders,
  updateReminderScheduleForUser,
} from '@/lib/schedule-notification'

const mockPrefFindUnique = prisma.notificationPreference.findUnique as jest.Mock
const mockSnFindMany = prisma.scheduledNotification.findMany as jest.Mock
const mockSnUpsert = prisma.scheduledNotification.upsert as jest.Mock
const mockSnUpdate = prisma.scheduledNotification.update as jest.Mock
const mockSnUpdateMany = prisma.scheduledNotification.updateMany as jest.Mock

// Event 24h from now — reminder at 2h before is still in the future
const futureEvent = {
  id: 'evt-1',
  title: 'Sunday Worship',
  datetime: new Date(Date.now() + 24 * 60 * 60 * 1000),
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPrefFindUnique.mockResolvedValue(null) // default: no stored preference
  mockSnUpsert.mockResolvedValue({})
  mockSnUpdate.mockResolvedValue({})
  mockSnUpdateMany.mockResolvedValue({})
  mockSnFindMany.mockResolvedValue([])
})

describe('scheduleEventReminder', () => {
  it('upserts a reminder with the default 2-hour timing when no preference exists', async () => {
    await scheduleEventReminder('user-1', futureEvent)

    expect(mockSnUpsert).toHaveBeenCalledWith({
      where: { userId_type_eventId: { userId: 'user-1', type: 'EVENT_REMINDER', eventId: 'evt-1' } },
      update: expect.objectContaining({ scheduledFor: expect.any(Date) }),
      create: expect.objectContaining({
        userId: 'user-1',
        type: 'EVENT_REMINDER',
        eventId: 'evt-1',
        scheduledFor: expect.any(Date),
        payload: expect.objectContaining({
          title: 'Event Reminder',
          body: 'Sunday Worship starts in 2 hours',
          data: expect.objectContaining({ eventId: 'evt-1' }),
        }),
      }),
    })
  })

  it('uses stored hoursBeforeEvent preference when set', async () => {
    mockPrefFindUnique.mockResolvedValue({ config: { hoursBeforeEvent: 4 } })

    await scheduleEventReminder('user-1', futureEvent)

    expect(mockSnUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          payload: expect.objectContaining({ body: 'Sunday Worship starts in 4 hours' }),
        }),
      })
    )
  })

  it('uses "1 hour" (singular) when hoursBeforeEvent is 1', async () => {
    mockPrefFindUnique.mockResolvedValue({ config: { hoursBeforeEvent: 1 } })

    await scheduleEventReminder('user-1', futureEvent)

    expect(mockSnUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          payload: expect.objectContaining({ body: 'Sunday Worship starts in 1 hour' }),
        }),
      })
    )
  })

  it('stores the event datetime in the payload data', async () => {
    await scheduleEventReminder('user-1', futureEvent)

    expect(mockSnUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          payload: expect.objectContaining({
            data: expect.objectContaining({
              eventDatetime: futureEvent.datetime.toISOString(),
            }),
          }),
        }),
      })
    )
  })

  it('does nothing when the reminder time has already passed', async () => {
    // Event is only 30 minutes away — 2h reminder window already passed
    const soonEvent = {
      id: 'evt-soon',
      title: 'Imminent Event',
      datetime: new Date(Date.now() + 30 * 60 * 1000),
    }

    await scheduleEventReminder('user-1', soonEvent)

    expect(mockSnUpsert).not.toHaveBeenCalled()
  })

  it('clears cancelledAt on update so re-attending restores the reminder', async () => {
    await scheduleEventReminder('user-1', futureEvent)

    expect(mockSnUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ cancelledAt: null }),
      })
    )
  })

  it('falls back to default when stored config has no hoursBeforeEvent', async () => {
    mockPrefFindUnique.mockResolvedValue({ config: 'not-an-object' })

    await scheduleEventReminder('user-1', futureEvent)

    expect(mockSnUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          payload: expect.objectContaining({ body: 'Sunday Worship starts in 2 hours' }),
        }),
      })
    )
  })

  it('falls back to default when stored config hoursBeforeEvent is not a number', async () => {
    mockPrefFindUnique.mockResolvedValue({ config: { hoursBeforeEvent: 'four' } })

    await scheduleEventReminder('user-1', futureEvent)

    expect(mockSnUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          payload: expect.objectContaining({ body: 'Sunday Worship starts in 2 hours' }),
        }),
      })
    )
  })
})

describe('cancelEventReminder', () => {
  it('sets cancelledAt using the eventId column filter', async () => {
    await cancelEventReminder('user-1', 'evt-1')

    expect(mockSnUpdateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', type: 'EVENT_REMINDER', eventId: 'evt-1', sentAt: null, cancelledAt: null },
      data: { cancelledAt: expect.any(Date) },
    })
  })
})

describe('cancelAllRemindersForEvent', () => {
  it('sets cancelledAt for all attendees using the eventId column filter', async () => {
    await cancelAllRemindersForEvent('evt-1')

    expect(mockSnUpdateMany).toHaveBeenCalledWith({
      where: { type: 'EVENT_REMINDER', eventId: 'evt-1', sentAt: null, cancelledAt: null },
      data: { cancelledAt: expect.any(Date) },
    })
  })
})

describe('rescheduleEventReminders', () => {
  it('updates scheduledFor for each pending reminder preserving per-user preferences', async () => {
    const newDatetime = new Date(Date.now() + 48 * 60 * 60 * 1000)
    mockSnFindMany.mockResolvedValue([
      {
        id: 'sn-1',
        userId: 'user-1',
        payload: {
          title: 'Event Reminder',
          body: 'Sunday Worship starts in 2 hours',
          data: { type: 'event_reminder', eventId: 'evt-1', eventTitle: 'Sunday Worship', eventDatetime: new Date().toISOString() },
        },
      },
    ])
    // user-1 has a 4h preference
    mockPrefFindUnique.mockResolvedValue({ config: { hoursBeforeEvent: 4 } })

    await rescheduleEventReminders('evt-1', newDatetime)

    expect(mockSnFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ eventId: 'evt-1' }),
      })
    )
    expect(mockSnUpdate).toHaveBeenCalledWith({
      where: { id: 'sn-1' },
      data: expect.objectContaining({
        scheduledFor: expect.any(Date),
        payload: expect.objectContaining({
          data: expect.objectContaining({ eventDatetime: newDatetime.toISOString() }),
        }),
      }),
    })
  })

  it('does nothing when there are no pending reminders', async () => {
    mockSnFindMany.mockResolvedValue([])

    await rescheduleEventReminders('evt-1', new Date())

    expect(mockSnUpdate).not.toHaveBeenCalled()
  })
})

describe('updateReminderScheduleForUser', () => {
  it('updates scheduledFor and body for pending reminders with the new timing', async () => {
    const eventDatetime = new Date(Date.now() + 48 * 60 * 60 * 1000)
    mockSnFindMany.mockResolvedValue([
      {
        id: 'sn-1',
        payload: {
          title: 'Event Reminder',
          body: 'My Event starts in 2 hours',
          data: { eventTitle: 'My Event', eventDatetime: eventDatetime.toISOString() },
        },
      },
    ])

    await updateReminderScheduleForUser('user-1', 4)

    expect(mockSnUpdate).toHaveBeenCalledWith({
      where: { id: 'sn-1' },
      data: expect.objectContaining({
        scheduledFor: expect.any(Date),
        payload: expect.objectContaining({
          body: expect.stringContaining('4 hours'),
        }),
      }),
    })
  })

  it('uses "1 hour" (singular) when new timing is 1 hour', async () => {
    const eventDatetime = new Date(Date.now() + 48 * 60 * 60 * 1000)
    mockSnFindMany.mockResolvedValue([
      {
        id: 'sn-1',
        payload: {
          title: 'Event Reminder',
          body: 'My Event starts in 2 hours',
          data: { eventTitle: 'My Event', eventDatetime: eventDatetime.toISOString() },
        },
      },
    ])

    await updateReminderScheduleForUser('user-1', 1)

    expect(mockSnUpdate).toHaveBeenCalledWith({
      where: { id: 'sn-1' },
      data: expect.objectContaining({
        payload: expect.objectContaining({ body: expect.stringContaining('1 hour') }),
      }),
    })
  })

  it('skips reminders where the new scheduled time has already passed', async () => {
    // Event is only 1 hour away; requesting 4h-before would be in the past
    const eventDatetime = new Date(Date.now() + 60 * 60 * 1000)
    mockSnFindMany.mockResolvedValue([
      {
        id: 'sn-1',
        payload: {
          title: 'Event Reminder',
          body: 'My Event starts in 2 hours',
          data: { eventTitle: 'My Event', eventDatetime: eventDatetime.toISOString() },
        },
      },
    ])

    await updateReminderScheduleForUser('user-1', 4)

    expect(mockSnUpdate).not.toHaveBeenCalled()
  })

  it('builds the new body from eventTitle in payload.data, not the old body string', async () => {
    const eventDatetime = new Date(Date.now() + 48 * 60 * 60 * 1000)
    mockSnFindMany.mockResolvedValue([
      {
        id: 'sn-1',
        payload: {
          title: 'Event Reminder',
          body: 'stale or malformed body text',
          data: { eventTitle: 'Evening Prayer', eventDatetime: eventDatetime.toISOString() },
        },
      },
    ])

    await updateReminderScheduleForUser('user-1', 3)

    expect(mockSnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payload: expect.objectContaining({ body: 'Evening Prayer starts in 3 hours' }),
        }),
      })
    )
  })

  it('does nothing when there are no pending reminders', async () => {
    mockSnFindMany.mockResolvedValue([])

    await updateReminderScheduleForUser('user-1', 2)

    expect(mockSnUpdate).not.toHaveBeenCalled()
  })
})
