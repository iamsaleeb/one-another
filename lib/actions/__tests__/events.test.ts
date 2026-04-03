jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  updateTag: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    event: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    series: {
      findUnique: jest.fn(),
    },
    eventAttendee: {
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    seriesFollower: {
      findMany: jest.fn(),
    },
    scheduledNotification: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/schedule-notification', () => ({
  scheduleEventReminder: jest.fn(),
  cancelEventReminder: jest.fn(),
  cancelAllRemindersForEvent: jest.fn(),
  rescheduleEventReminders: jest.fn(),
}))

jest.mock('@/lib/notifications', () => ({
  sendPushToUsers: jest.fn(),
}))

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/permissions', () => ({
  canManageChurch: jest.fn(),
}))

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  createEventAction,
  updateEventAction,
  cancelEventAction,
  uncancelEventAction,
  deleteEventAction,
  publishEventAction,
  unpublishEventAction,
  attendEventAction,
  unattendEventAction,
  registerEventAction,
} from '@/lib/actions/events'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { canManageChurch } from '@/lib/permissions'

const mockRedirect = redirect as unknown as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock
const mockEventCreate = prisma.event.create as jest.Mock
const mockEventUpdate = prisma.event.update as jest.Mock
const mockEventFindUnique = prisma.event.findUnique as jest.Mock
const mockSeriesFindUnique = prisma.series.findUnique as jest.Mock
const mockEventDelete = prisma.event.delete as jest.Mock
const mockEventAttendeeCreate = prisma.eventAttendee.create as jest.Mock
const mockEventAttendeeDelete = prisma.eventAttendee.delete as jest.Mock
const mockEventAttendeeFindMany = prisma.eventAttendee.findMany as jest.Mock
const mockSeriesFollowerFindMany = prisma.seriesFollower.findMany as jest.Mock
const mockAuth = auth as jest.Mock
const mockCanManageChurch = canManageChurch as jest.Mock

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  return fd
}

const validData = {
  title: 'Sunday Worship',
  date: '2026-04-06',
  time: '09:00',
  location: 'Main Hall',
  host: 'Pastor John',
  tag: 'Youth Meeting',
  description: 'Weekly Sunday service',
  churchId: 'ch-1',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ORGANISER' } })
  mockCanManageChurch.mockResolvedValue(true)
  mockSeriesFollowerFindMany.mockResolvedValue([])
  mockEventAttendeeFindMany.mockResolvedValue([])
})

describe('createEventAction', () => {
  it('creates an event and redirects to my-events', async () => {
    mockEventCreate.mockResolvedValue({ id: 'evt-1' })

    await createEventAction(validData)

    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Sunday Worship',
          datetime: new Date('2026-04-06T09:00'),
          location: 'Main Hall',
          host: 'Pastor John',
          tag: 'Youth Meeting',
          description: 'Weekly Sunday service',
          isPast: false,
          churchId: 'ch-1',
          createdById: 'user-1',
        }),
      })
    )
    expect(mockRedirect).toHaveBeenCalledWith('/my-events')
  })

  it('redirects to the series page when seriesId is provided', async () => {
    mockSeriesFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventCreate.mockResolvedValue({ id: 'evt-2' })

    await createEventAction({ ...validData, seriesId: 'ser-1' })

    expect(mockSeriesFindUnique).toHaveBeenCalledWith({
      where: { id: 'ser-1' },
      select: { churchId: true },
    })
    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ seriesId: 'ser-1', churchId: 'ch-1' }),
      })
    )
    expect(mockRedirect).toHaveBeenCalledWith('/series/ser-1')
  })

  it('inherits churchId from the series, ignoring any submitted churchId', async () => {
    mockSeriesFindUnique.mockResolvedValue({ churchId: 'ch-from-series' })
    mockEventCreate.mockResolvedValue({ id: 'evt-3' })

    await createEventAction({ ...validData, seriesId: 'ser-1', churchId: 'ch-submitted' })

    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ churchId: 'ch-from-series' }),
      })
    )
  })

  it('includes churchId when provided for a standalone event', async () => {
    mockEventCreate.mockResolvedValue({ id: 'evt-4' })

    await createEventAction({ ...validData, churchId: 'ch-99' })

    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ churchId: 'ch-99' }),
      })
    )
  })

  it('uses datetimeISO when provided, ignoring date+time fields', async () => {
    mockEventCreate.mockResolvedValue({ id: 'evt-1' })
    const datetimeISO = '2026-04-06T09:00:00.000Z'

    await createEventAction({ ...validData, datetimeISO })

    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          datetime: new Date(datetimeISO),
        }),
      })
    )
  })

  it('returns a fieldError when churchId is empty for a standalone event', async () => {
    const result = await createEventAction({ ...validData, churchId: '' })

    expect(result.fieldErrors?.churchId).toBeDefined()
    expect(mockEventCreate).not.toHaveBeenCalled()
  })

  it('returns fieldErrors when required fields are missing', async () => {
    const result = await createEventAction({ ...validData, title: '' })

    expect(result.fieldErrors).toBeDefined()
    expect(result.fieldErrors?.title).toBeDefined()
    expect(mockEventCreate).not.toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('returns an unauthorized error when there is no session', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await createEventAction(validData)

    expect(result.error).toBeDefined()
    expect(mockEventCreate).not.toHaveBeenCalled()
  })

  it('returns an unauthorized error when the user is not an organiser', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ATTENDEE' } })

    const result = await createEventAction(validData)

    expect(result.error).toBeDefined()
    expect(mockEventCreate).not.toHaveBeenCalled()
  })

  it('returns an error when organiser is not assigned to the church', async () => {
    mockCanManageChurch.mockResolvedValue(false)

    const result = await createEventAction(validData)

    expect(result.error).toBe('You are not assigned to this church.')
    expect(mockEventCreate).not.toHaveBeenCalled()
  })

  it('saves requiresRegistration=true when passed as boolean', async () => {
    mockEventCreate.mockResolvedValue({ id: 'evt-5' })

    await createEventAction({ ...validData, requiresRegistration: true })

    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requiresRegistration: true }),
      })
    )
  })

  it('saves requiresRegistration=false when the field is absent', async () => {
    mockEventCreate.mockResolvedValue({ id: 'evt-6' })

    await createEventAction(validData)

    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ requiresRegistration: false }),
      })
    )
  })

  it('saves isDraft=true and redirects to the organiser page when saving as draft', async () => {
    mockEventCreate.mockResolvedValue({ id: 'evt-draft' })

    await createEventAction({ ...validData, isDraft: true })

    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isDraft: true }),
      })
    )
    expect(mockRedirect).toHaveBeenCalledWith('/organiser')
  })

  it('handles series push notification failure gracefully', async () => {
    const mockSendPush = jest.requireMock('@/lib/notifications').sendPushToUsers as jest.Mock
    mockSeriesFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventCreate.mockResolvedValue({ id: 'evt-series-fail' })
    mockSeriesFollowerFindMany.mockResolvedValue([{ userId: 'follower-1' }])
    mockSendPush.mockRejectedValueOnce(new Error('push failed'))

    await createEventAction({ ...validData, seriesId: 'ser-1' })

    expect(mockRedirect).toHaveBeenCalledWith('/series/ser-1')
  })

  it('does not send series push notification when saving as draft', async () => {
    const mockSendPush = jest.requireMock('@/lib/notifications').sendPushToUsers as jest.Mock
    mockSeriesFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventCreate.mockResolvedValue({ id: 'evt-draft-series' })

    await createEventAction({ ...validData, seriesId: 'ser-1', isDraft: true })

    expect(mockSendPush).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/organiser')
  })

  it('sends series push notification when publishing with seriesId and followers exist', async () => {
    const mockSendPush = jest.requireMock('@/lib/notifications').sendPushToUsers as jest.Mock
    mockSeriesFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventCreate.mockResolvedValue({ id: 'evt-series' })
    mockSeriesFollowerFindMany.mockResolvedValue([{ userId: 'follower-1' }])

    await createEventAction({ ...validData, seriesId: 'ser-1' })

    expect(mockSendPush).toHaveBeenCalledWith(
      ['follower-1'],
      'NEW_SERIES_SESSION',
      'New Session Added',
      expect.stringContaining(validData.title),
      expect.objectContaining({ type: 'new_session', seriesId: 'ser-1' })
    )
  })

  it('persists photoUrl when provided', async () => {
    mockEventCreate.mockResolvedValue({ id: 'evt-photo' })

    await createEventAction({ ...validData, photoUrl: 'https://utfs.io/f/photo.jpg' })

    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ photoUrl: 'https://utfs.io/f/photo.jpg' }),
      })
    )
  })

  it('sets photoUrl to null when not provided', async () => {
    mockEventCreate.mockResolvedValue({ id: 'evt-no-photo' })

    await createEventAction(validData)

    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ photoUrl: null }),
      })
    )
  })
})

describe('cancelEventAction', () => {
  it('updates the event with cancelledAt and reason, then redirects to event page', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventUpdate.mockResolvedValue({})

    await cancelEventAction('evt-1', 'Venue unavailable')

    expect(mockEventUpdate).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: expect.objectContaining({ cancellationReason: 'Venue unavailable' }),
    })
    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('redirects away when the user is not an organiser', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ATTENDEE' } })
    mockRedirect.mockImplementationOnce(() => { throw new Error('NEXT_REDIRECT') })

    await expect(cancelEventAction('evt-1', 'reason')).rejects.toThrow('NEXT_REDIRECT')

    expect(mockEventUpdate).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('redirects away when the user cannot manage the church', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockCanManageChurch.mockResolvedValue(false)
    mockRedirect.mockImplementationOnce(() => { throw new Error('NEXT_REDIRECT') })

    await expect(cancelEventAction('evt-1', 'reason')).rejects.toThrow('NEXT_REDIRECT')

    expect(mockEventUpdate).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })

  it('redirects to /organiser when the event is not found', async () => {
    mockEventFindUnique.mockResolvedValue(null)
    mockRedirect.mockImplementationOnce(() => { throw new Error('NEXT_REDIRECT') })

    await expect(cancelEventAction('evt-missing', 'reason')).rejects.toThrow('NEXT_REDIRECT')

    expect(mockEventUpdate).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/organiser')
  })

  it('sends push notification to attendees on cancel', async () => {
    const mockSendPush = jest.requireMock('@/lib/notifications').sendPushToUsers as jest.Mock
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1', title: 'Test Event' })
    mockEventUpdate.mockResolvedValue({})
    mockEventAttendeeFindMany.mockResolvedValue([{ userId: 'user-2' }])

    await cancelEventAction('evt-1', 'Venue unavailable')

    expect(mockSendPush).toHaveBeenCalledWith(
      ['user-2'],
      'EVENT_CANCELLED',
      'Event Cancelled',
      expect.stringContaining('Test Event'),
      expect.objectContaining({ type: 'event_cancelled', eventId: 'evt-1' })
    )
  })

  it('handles EVENT_CANCELLED push failure gracefully', async () => {
    const mockSendPush = jest.requireMock('@/lib/notifications').sendPushToUsers as jest.Mock
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1', title: 'Test Event' })
    mockEventUpdate.mockResolvedValue({})
    mockEventAttendeeFindMany.mockResolvedValue([{ userId: 'user-2' }])
    mockSendPush.mockRejectedValueOnce(new Error('push failed'))

    await cancelEventAction('evt-1', 'reason')

    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
  })
})

describe('uncancelEventAction', () => {
  it('clears cancelledAt and cancellationReason, then redirects to event page', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventUpdate.mockResolvedValue({})

    await uncancelEventAction('evt-1')

    expect(mockEventUpdate).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: { cancelledAt: null, cancellationReason: null },
    })
    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('redirects away when the user is not an organiser', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ATTENDEE' } })
    mockRedirect.mockImplementationOnce(() => { throw new Error('NEXT_REDIRECT') })

    await expect(uncancelEventAction('evt-1')).rejects.toThrow('NEXT_REDIRECT')

    expect(mockEventUpdate).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/')
  })
})

describe('attendEventAction', () => {
  const publishedEvent = { id: 'evt-1', title: 'Test', datetime: new Date('2026-05-01T09:00:00Z'), isDraft: false }

  it('creates an EventAttendee and revalidates the event path', async () => {
    mockEventFindUnique.mockResolvedValue(publishedEvent)
    mockEventAttendeeCreate.mockResolvedValue({})

    await attendEventAction('evt-1')

    expect(mockEventAttendeeCreate).toHaveBeenCalledWith({
      data: { eventId: 'evt-1', userId: 'user-1' },
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/events/evt-1')
  })

  it('returns an error when the event is a draft', async () => {
    mockEventFindUnique.mockResolvedValue({ ...publishedEvent, isDraft: true })

    const result = await attendEventAction('evt-1')

    expect(result.error).toBeDefined()
    expect(mockEventAttendeeCreate).not.toHaveBeenCalled()
  })

  it('returns an error when the event does not exist', async () => {
    mockEventFindUnique.mockResolvedValue(null)

    const result = await attendEventAction('evt-1')

    expect(result.error).toBeDefined()
    expect(mockEventAttendeeCreate).not.toHaveBeenCalled()
  })

  it('returns an error when the user is not signed in', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await attendEventAction('evt-1')

    expect(result.error).toBeDefined()
    expect(mockEventAttendeeCreate).not.toHaveBeenCalled()
  })

  it('handles scheduleEventReminder failure gracefully', async () => {
    const mockScheduleReminder = jest.requireMock('@/lib/schedule-notification').scheduleEventReminder as jest.Mock
    mockEventFindUnique.mockResolvedValue(publishedEvent)
    mockEventAttendeeCreate.mockResolvedValue({})
    mockScheduleReminder.mockRejectedValueOnce(new Error('scheduler down'))

    const result = await attendEventAction('evt-1')

    expect(result.error).toBeUndefined()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/events/evt-1')
  })
})

describe('unattendEventAction', () => {
  it('deletes the EventAttendee and revalidates the event path', async () => {
    mockEventAttendeeDelete.mockResolvedValue({})

    await unattendEventAction('evt-1')

    expect(mockEventAttendeeDelete).toHaveBeenCalledWith({
      where: { eventId_userId: { eventId: 'evt-1', userId: 'user-1' } },
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/events/evt-1')
  })

  it('returns an error when the user is not signed in', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await unattendEventAction('evt-1')

    expect(result.error).toBeDefined()
    expect(mockEventAttendeeDelete).not.toHaveBeenCalled()
  })

  it('handles cancelEventReminder failure gracefully', async () => {
    const mockCancelReminder = jest.requireMock('@/lib/schedule-notification').cancelEventReminder as jest.Mock
    mockEventAttendeeDelete.mockResolvedValue({})
    mockCancelReminder.mockRejectedValueOnce(new Error('scheduler down'))

    const result = await unattendEventAction('evt-1')

    expect(result.error).toBeUndefined()
    expect(mockRevalidatePath).toHaveBeenCalledWith('/events/evt-1')
  })
})

describe('registerEventAction', () => {
  const publishedRegEvent = { id: 'evt-1', title: 'Test', datetime: new Date('2026-05-01T09:00:00Z'), isDraft: false, metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } }, _count: { attendees: 0 } }

  it('creates an EventAttendee with phone and notes', async () => {
    mockEventFindUnique.mockResolvedValue(publishedRegEvent)
    mockEventAttendeeCreate.mockResolvedValue({})

    const fd = makeFormData({ phone: '07700000000', notes: 'Vegetarian' })
    const result = await registerEventAction('evt-1', {}, fd)

    expect(mockEventAttendeeCreate).toHaveBeenCalledWith({
      data: {
        eventId: 'evt-1',
        userId: 'user-1',
        phone: '07700000000',
        notes: 'Vegetarian',
      },
    })
    expect(result.success).toBe(true)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/events/evt-1')
  })

  it('creates an EventAttendee with no optional fields when form is empty', async () => {
    mockEventFindUnique.mockResolvedValue(publishedRegEvent)
    mockEventAttendeeCreate.mockResolvedValue({})

    const result = await registerEventAction('evt-1', {}, makeFormData({}))

    expect(mockEventAttendeeCreate).toHaveBeenCalledWith({
      data: { eventId: 'evt-1', userId: 'user-1', phone: undefined, notes: undefined },
    })
    expect(result.success).toBe(true)
  })

  it('returns an error when the user is not signed in', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await registerEventAction('evt-1', {}, makeFormData({}))

    expect(result.error).toBeDefined()
    expect(mockEventAttendeeCreate).not.toHaveBeenCalled()
  })

  it('returns an error when the event is a draft', async () => {
    mockEventFindUnique.mockResolvedValue({ ...publishedRegEvent, isDraft: true })

    const result = await registerEventAction('evt-1', {}, makeFormData({}))

    expect(result.error).toBeDefined()
    expect(mockEventAttendeeCreate).not.toHaveBeenCalled()
  })

  it('returns an error when the event does not exist', async () => {
    mockEventFindUnique.mockResolvedValue(null)

    const result = await registerEventAction('evt-1', {}, makeFormData({}))

    expect(result.error).toBeDefined()
    expect(mockEventAttendeeCreate).not.toHaveBeenCalled()
  })

  it('allows registration when capacity is not set', async () => {
    mockEventFindUnique.mockResolvedValue({ ...publishedRegEvent, metadata: { registration: { capacity: null, collectPhone: false, collectNotes: false } }, _count: { attendees: 10 } })
    mockEventAttendeeCreate.mockResolvedValue({})

    const result = await registerEventAction('evt-1', {}, makeFormData({}))

    expect(result.success).toBe(true)
    expect(mockEventAttendeeCreate).toHaveBeenCalled()
  })

  it('allows registration when spots are still available', async () => {
    mockEventFindUnique.mockResolvedValue({ ...publishedRegEvent, metadata: { registration: { capacity: 10, collectPhone: false, collectNotes: false } }, _count: { attendees: 9 } })
    mockEventAttendeeCreate.mockResolvedValue({})

    const result = await registerEventAction('evt-1', {}, makeFormData({}))

    expect(result.success).toBe(true)
    expect(mockEventAttendeeCreate).toHaveBeenCalled()
  })

  it('returns a fully booked error when capacity is reached', async () => {
    mockEventFindUnique.mockResolvedValue({ ...publishedRegEvent, metadata: { registration: { capacity: 10, collectPhone: false, collectNotes: false } }, _count: { attendees: 10 } })

    const result = await registerEventAction('evt-1', {}, makeFormData({}))

    expect(result.error).toBe('Sorry, this event is fully booked.')
    expect(mockEventAttendeeCreate).not.toHaveBeenCalled()
  })

  it('handles scheduleEventReminder failure gracefully', async () => {
    const mockScheduleReminder = jest.requireMock('@/lib/schedule-notification').scheduleEventReminder as jest.Mock
    mockEventFindUnique.mockResolvedValue(publishedRegEvent)
    mockEventAttendeeCreate.mockResolvedValue({})
    mockScheduleReminder.mockRejectedValueOnce(new Error('scheduler down'))

    const result = await registerEventAction('evt-1', {}, makeFormData({}))

    expect(result.success).toBe(true)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/events/evt-1')
  })
})

describe('updateEventAction', () => {
  const oldDatetime = new Date('2026-05-01T09:00:00Z')
  const existingPublished = { churchId: 'ch-1', datetime: oldDatetime, title: 'Old Title', isDraft: false }
  const existingDraft = { churchId: 'ch-1', datetime: oldDatetime, title: 'Old Title', isDraft: true }

  it('updates the event and redirects to the event page', async () => {
    mockEventFindUnique.mockResolvedValue(existingPublished)
    mockEventUpdate.mockResolvedValue({})

    await updateEventAction('evt-1', validData)

    expect(mockEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'evt-1' },
        data: expect.objectContaining({ title: 'Sunday Worship', churchId: 'ch-1' }),
      })
    )
    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('uses datetimeISO when provided, ignoring date+time fields', async () => {
    mockEventFindUnique.mockResolvedValue(existingPublished)
    mockEventUpdate.mockResolvedValue({})
    const datetimeISO = '2026-06-01T10:00:00.000Z'

    await updateEventAction('evt-1', { ...validData, datetimeISO })

    expect(mockEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          datetime: new Date(datetimeISO),
        }),
      })
    )
  })

  it('returns fieldErrors when required fields are missing', async () => {
    const result = await updateEventAction('evt-1', { ...validData, title: '' })

    expect(result?.fieldErrors?.title).toBeDefined()
    expect(mockEventUpdate).not.toHaveBeenCalled()
  })

  it('redirects away when the user is not an organiser', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ATTENDEE' } })
    mockRedirect.mockImplementationOnce(() => { throw new Error('NEXT_REDIRECT') })

    await expect(updateEventAction('evt-1', validData)).rejects.toThrow('NEXT_REDIRECT')

    expect(mockEventUpdate).not.toHaveBeenCalled()
  })

  it('redirects to /organiser when the event is not found', async () => {
    mockEventFindUnique.mockResolvedValue(null)
    mockRedirect.mockImplementationOnce(() => { throw new Error('NEXT_REDIRECT') })

    await expect(updateEventAction('evt-1', validData)).rejects.toThrow('NEXT_REDIRECT')

    expect(mockEventUpdate).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/organiser')
  })

  it('redirects away when the organiser cannot manage the original church', async () => {
    mockEventFindUnique.mockResolvedValue(existingPublished)
    mockCanManageChurch.mockResolvedValue(false)
    mockRedirect.mockImplementationOnce(() => { throw new Error('NEXT_REDIRECT') })

    await expect(updateEventAction('evt-1', validData)).rejects.toThrow('NEXT_REDIRECT')

    expect(mockEventUpdate).not.toHaveBeenCalled()
  })

  it('reschedules reminders when datetime changes on a published event', async () => {
    const mockReschedule = jest.requireMock('@/lib/schedule-notification').rescheduleEventReminders as jest.Mock
    mockEventFindUnique.mockResolvedValue(existingPublished)
    mockEventUpdate.mockResolvedValue({})
    // Use a different date to trigger reschedule
    const newDate = '2026-05-10'

    await updateEventAction('evt-1', { ...validData, date: newDate })

    expect(mockReschedule).toHaveBeenCalledWith('evt-1', new Date(`${newDate}T${validData.time}`))
  })

  it('does not reschedule when the datetime is unchanged', async () => {
    const mockReschedule = jest.requireMock('@/lib/schedule-notification').rescheduleEventReminders as jest.Mock
    // existingPublished.datetime is new Date('2026-05-01T09:00:00Z') — match exactly using local-time constructor
    const sameDate = '2026-05-01'
    const sameTime = '09:00'
    const existingWithLocalDatetime = { ...existingPublished, datetime: new Date(`${sameDate}T${sameTime}`) }
    mockEventFindUnique.mockResolvedValue(existingWithLocalDatetime)
    mockEventUpdate.mockResolvedValue({})

    await updateEventAction('evt-1', { ...validData, date: sameDate, time: sameTime })

    expect(mockReschedule).not.toHaveBeenCalled()
  })

  it('does not reschedule reminders when the event is a draft', async () => {
    const mockReschedule = jest.requireMock('@/lib/schedule-notification').rescheduleEventReminders as jest.Mock
    mockEventFindUnique.mockResolvedValue(existingDraft)
    mockEventUpdate.mockResolvedValue({})

    await updateEventAction('evt-1', { ...validData, date: '2026-05-10' })

    expect(mockReschedule).not.toHaveBeenCalled()
  })

  it('returns a fieldError when churchId is missing for a standalone event', async () => {
    mockEventFindUnique.mockResolvedValue(existingPublished)

    const result = await updateEventAction('evt-1', { ...validData, churchId: '' })

    expect(result?.fieldErrors?.churchId).toBeDefined()
    expect(mockEventUpdate).not.toHaveBeenCalled()
  })

  it('inherits churchId from series when seriesId is provided', async () => {
    mockSeriesFindUnique.mockResolvedValue({ churchId: 'ch-from-series' })
    mockEventFindUnique.mockResolvedValue({ ...existingPublished, churchId: 'ch-from-series' })
    mockEventUpdate.mockResolvedValue({})

    await updateEventAction('evt-1', { ...validData, seriesId: 'ser-1', churchId: 'ch-submitted' })

    expect(mockEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ churchId: 'ch-from-series' }),
      })
    )
  })

  it('checks new church permission when church changes', async () => {
    mockEventFindUnique.mockResolvedValue(existingPublished)
    // First canManageChurch call (original church) returns true, second (new church) returns false
    mockCanManageChurch
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
    mockRedirect.mockImplementationOnce(() => { throw new Error('NEXT_REDIRECT') })

    await expect(updateEventAction('evt-1', { ...validData, churchId: 'ch-new' })).rejects.toThrow('NEXT_REDIRECT')

    expect(mockEventUpdate).not.toHaveBeenCalled()
  })

  it('persists photoUrl when provided', async () => {
    mockEventFindUnique.mockResolvedValue(existingPublished)
    mockEventUpdate.mockResolvedValue({})

    await updateEventAction('evt-1', { ...validData, photoUrl: 'https://utfs.io/f/photo.jpg' })

    expect(mockEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ photoUrl: 'https://utfs.io/f/photo.jpg' }),
      })
    )
  })

  it('sets photoUrl to null when not provided', async () => {
    mockEventFindUnique.mockResolvedValue(existingPublished)
    mockEventUpdate.mockResolvedValue({})

    await updateEventAction('evt-1', validData)

    expect(mockEventUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ photoUrl: null }),
      })
    )
  })
})

describe('deleteEventAction', () => {
  it('cancels reminders, deletes the event, and redirects to /organiser', async () => {
    const mockCancelAll = jest.requireMock('@/lib/schedule-notification').cancelAllRemindersForEvent as jest.Mock
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventDelete.mockResolvedValue({})

    await deleteEventAction('evt-1')

    expect(mockCancelAll).toHaveBeenCalledWith('evt-1')
    expect(mockEventDelete).toHaveBeenCalledWith({ where: { id: 'evt-1' } })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRedirect).toHaveBeenCalledWith('/organiser')
  })

  it('redirects away when the user is not an organiser', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ATTENDEE' } })
    mockRedirect.mockImplementationOnce(() => { throw new Error('NEXT_REDIRECT') })

    await expect(deleteEventAction('evt-1')).rejects.toThrow('NEXT_REDIRECT')

    expect(mockEventDelete).not.toHaveBeenCalled()
  })

  it('redirects to /organiser when the event is not found', async () => {
    mockEventFindUnique.mockResolvedValue(null)
    mockRedirect.mockImplementationOnce(() => { throw new Error('NEXT_REDIRECT') })

    await expect(deleteEventAction('evt-missing')).rejects.toThrow('NEXT_REDIRECT')

    expect(mockEventDelete).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/organiser')
  })

  it('redirects away when the organiser cannot manage the church', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockCanManageChurch.mockResolvedValue(false)
    mockRedirect.mockImplementationOnce(() => { throw new Error('NEXT_REDIRECT') })

    await expect(deleteEventAction('evt-1')).rejects.toThrow('NEXT_REDIRECT')

    expect(mockEventDelete).not.toHaveBeenCalled()
  })

  it('handles cancelAllRemindersForEvent failure gracefully', async () => {
    const mockCancelAll = jest.requireMock('@/lib/schedule-notification').cancelAllRemindersForEvent as jest.Mock
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventDelete.mockResolvedValue({})
    mockCancelAll.mockRejectedValueOnce(new Error('scheduler down'))

    await deleteEventAction('evt-1')

    expect(mockEventDelete).toHaveBeenCalledWith({ where: { id: 'evt-1' } })
    expect(mockRedirect).toHaveBeenCalledWith('/organiser')
  })
})

describe('publishEventAction', () => {
  const mockScheduleReminder = jest.requireMock('@/lib/schedule-notification').scheduleEventReminder as jest.Mock
  const mockEventAttendeeFindMany = prisma.eventAttendee.findMany as jest.Mock

  it('sets isDraft to false, schedules reminders for attendees, and redirects to the event page', async () => {
    const datetime = new Date('2026-05-01T09:00:00Z')
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1', seriesId: null, title: 'Test', isDraft: true, datetime })
    mockEventUpdate.mockResolvedValue({})
    mockEventAttendeeFindMany.mockResolvedValue([{ userId: 'user-2' }, { userId: 'user-3' }])

    await publishEventAction('evt-1')

    expect(mockEventUpdate).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: { isDraft: false },
    })
    expect(mockScheduleReminder).toHaveBeenCalledTimes(2)
    expect(mockScheduleReminder).toHaveBeenCalledWith('user-2', { id: 'evt-1', title: 'Test', datetime })
    expect(mockScheduleReminder).toHaveBeenCalledWith('user-3', { id: 'evt-1', title: 'Test', datetime })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
  })

  it('schedules no reminders when there are no attendees', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1', seriesId: null, title: 'Test', isDraft: true, datetime: new Date() })
    mockEventUpdate.mockResolvedValue({})
    mockEventAttendeeFindMany.mockResolvedValue([])

    await publishEventAction('evt-1')

    expect(mockScheduleReminder).not.toHaveBeenCalled()
  })

  it('short-circuits without updating when the event is already published', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1', seriesId: null, title: 'Test', isDraft: false })
    mockRedirect.mockImplementationOnce(() => { throw new Error('NEXT_REDIRECT') })

    await expect(publishEventAction('evt-1')).rejects.toThrow('NEXT_REDIRECT')

    expect(mockEventUpdate).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
  })

  it('returns an unauthorised error when the user is not an organiser', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ATTENDEE' } })

    const result = await publishEventAction('evt-1')

    expect(result?.error).toBeDefined()
    expect(mockEventUpdate).not.toHaveBeenCalled()
  })

  it('returns an error when the organiser cannot manage the church', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1', seriesId: null, title: 'Test', isDraft: true })
    mockCanManageChurch.mockResolvedValue(false)

    const result = await publishEventAction('evt-1')

    expect(result?.error).toBeDefined()
    expect(mockEventUpdate).not.toHaveBeenCalled()
  })

  it('sends series push notification to followers when publishing a series event', async () => {
    const mockSendPush = jest.requireMock('@/lib/notifications').sendPushToUsers as jest.Mock
    const datetime = new Date('2026-05-01T09:00:00Z')
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1', seriesId: 'ser-1', title: 'Bible Study', isDraft: true, datetime })
    mockEventUpdate.mockResolvedValue({})
    mockEventAttendeeFindMany.mockResolvedValue([])
    mockSeriesFollowerFindMany.mockResolvedValue([{ userId: 'follower-1' }, { userId: 'follower-2' }])

    await publishEventAction('evt-1')

    expect(mockSendPush).toHaveBeenCalledWith(
      ['follower-1', 'follower-2'],
      'NEW_SERIES_SESSION',
      'New Session Added',
      expect.stringContaining('Bible Study'),
      expect.objectContaining({ type: 'new_session', seriesId: 'ser-1', eventId: 'evt-1' })
    )
  })

  it('handles reminder scheduling failure gracefully', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1', seriesId: null, title: 'Test', isDraft: true, datetime: new Date() })
    mockEventUpdate.mockResolvedValue({})
    mockEventAttendeeFindMany.mockResolvedValue([{ userId: 'user-2' }])
    mockScheduleReminder.mockRejectedValueOnce(new Error('scheduler down'))

    await publishEventAction('evt-1')

    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
  })

  it('handles NEW_SERIES_SESSION push failure gracefully', async () => {
    const mockSendPush = jest.requireMock('@/lib/notifications').sendPushToUsers as jest.Mock
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1', seriesId: 'ser-1', title: 'Test', isDraft: true, datetime: new Date() })
    mockEventUpdate.mockResolvedValue({})
    mockEventAttendeeFindMany.mockResolvedValue([])
    mockSeriesFollowerFindMany.mockResolvedValue([{ userId: 'follower-1' }])
    mockSendPush.mockRejectedValueOnce(new Error('push failed'))

    await publishEventAction('evt-1')

    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
  })
})

describe('unpublishEventAction', () => {
  const mockCancelAll = jest.requireMock('@/lib/schedule-notification').cancelAllRemindersForEvent as jest.Mock

  it('sets isDraft to true, cancels pending reminders, and redirects to the event page', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventUpdate.mockResolvedValue({})

    await unpublishEventAction('evt-1')

    expect(mockEventUpdate).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: { isDraft: true },
    })
    expect(mockCancelAll).toHaveBeenCalledWith('evt-1')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
  })

  it('returns an unauthorised error when the user is not an organiser', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ATTENDEE' } })

    const result = await unpublishEventAction('evt-1')

    expect(result?.error).toBeDefined()
    expect(mockEventUpdate).not.toHaveBeenCalled()
  })

  it('returns an error when the organiser cannot manage the church', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockCanManageChurch.mockResolvedValue(false)

    const result = await unpublishEventAction('evt-1')

    expect(result?.error).toBeDefined()
    expect(mockEventUpdate).not.toHaveBeenCalled()
  })

  it('handles cancelAllRemindersForEvent failure gracefully', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventUpdate.mockResolvedValue({})
    mockCancelAll.mockRejectedValueOnce(new Error('scheduler down'))

    await unpublishEventAction('evt-1')

    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
  })
})
