jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('next/cache', () => ({
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
      findUnique: jest.fn(),
    },
    seriesFollower: {
      findMany: jest.fn(),
    },
    notificationPreference: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock('@/lib/notifications/queue', () => ({
  queueNotification: jest.fn(),
  cancelNotification: jest.fn(),
  cancelManyNotifications: jest.fn(),
  rescheduleEventReminderNotifications: jest.fn(),
  scheduleEventReminderNotification: jest.fn(),
  updateUserReminderSchedule: jest.fn(),
}))

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/permissions', () => ({
  canManageChurch: jest.fn(),
}))

jest.mock('@/lib/dal/questions', () => ({
  syncEventQuestions: jest.fn().mockResolvedValue(undefined),
  getQuestionLibraryForUser: jest.fn().mockResolvedValue([]),
}))

jest.mock('@/lib/dal/attendance', () => ({
  attendEvent: jest.fn(),
  unattendEvent: jest.fn(),
  registerEvent: jest.fn(),
}))

import { NotificationType } from '@prisma/client'
import { redirect } from 'next/navigation'
import { updateTag } from 'next/cache'
import {
  createEventAction,
  updateEventAction,
  cancelEventAction,
  uncancelEventAction,
  deleteEventAction,
  publishEventAction,
  unpublishEventAction,
} from '@/lib/actions/events-crud'
import {
  attendEventAction,
  unattendEventAction,
  registerEventAction,
} from '@/lib/actions/events-attendance'
import { extractResponses } from '@/lib/utils/forms'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { canManageChurch } from '@/lib/permissions'
import { registerEvent as _registerEvent, attendEvent as _attendEvent, unattendEvent as _unattendEvent } from '@/lib/dal/attendance'

const mockRedirect = redirect as unknown as jest.Mock
const mockUpdateTag = updateTag as jest.Mock
const mockEventCreate = prisma.event.create as jest.Mock
const mockEventUpdate = prisma.event.update as jest.Mock
const mockEventFindUnique = prisma.event.findUnique as jest.Mock
const mockSeriesFindUnique = prisma.series.findUnique as jest.Mock
const mockEventDelete = prisma.event.delete as jest.Mock
const mockEventAttendeeFindMany = prisma.eventAttendee.findMany as jest.Mock
const mockEventAttendeeFindUnique = prisma.eventAttendee.findUnique as jest.Mock
const mockSeriesFollowerFindMany = prisma.seriesFollower.findMany as jest.Mock
const mockNotificationCreateMany = prisma.notification.createMany as jest.Mock
const mockQueueNotification = jest.requireMock('@/lib/notifications/queue').queueNotification as jest.Mock
const mockAuth = auth as jest.Mock
const mockCanManageChurch = canManageChurch as jest.Mock
const mockRegisterEvent = _registerEvent as jest.Mock
const mockAttendEvent = _attendEvent as jest.Mock
const mockUnattendEvent = _unattendEvent as jest.Mock

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
  questions: [],
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ORGANISER' } })
  mockCanManageChurch.mockResolvedValue(true)
  mockSeriesFollowerFindMany.mockResolvedValue([])
  mockEventAttendeeFindMany.mockResolvedValue([])
  mockEventAttendeeFindUnique.mockResolvedValue(null) // not already registered by default
  // DAL attendance defaults
  mockAttendEvent.mockResolvedValue({})
  mockUnattendEvent.mockResolvedValue({})
  mockRegisterEvent.mockResolvedValue({ success: true })
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
    mockSeriesFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventCreate.mockResolvedValue({ id: 'evt-series-fail' })
    mockSeriesFollowerFindMany.mockResolvedValue([{ userId: 'follower-1' }])
    mockQueueNotification.mockRejectedValueOnce(new Error('push failed'))

    await createEventAction({ ...validData, seriesId: 'ser-1' })

    expect(mockRedirect).toHaveBeenCalledWith('/series/ser-1')
  })

  it('does not send series push notification when saving as draft', async () => {
    mockSeriesFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventCreate.mockResolvedValue({ id: 'evt-draft-series' })

    await createEventAction({ ...validData, seriesId: 'ser-1', isDraft: true })

    expect(mockQueueNotification).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/organiser')
  })

  it('sends series push notification when publishing with seriesId and followers exist', async () => {
    mockSeriesFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventCreate.mockResolvedValue({ id: 'evt-series' })
    mockSeriesFollowerFindMany.mockResolvedValue([{ userId: 'follower-1' }])

    await createEventAction({ ...validData, seriesId: 'ser-1' })

    expect(mockQueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'follower-1',
        type: NotificationType.NEW_SERIES_SESSION,
        title: 'New Session Added',
        body: expect.stringContaining(validData.title),
        data: expect.objectContaining({ type: 'new_session', seriesId: 'ser-1' }),
        dedupeKey: expect.stringContaining('ser-1'),
      })
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
    expect(mockUpdateTag).toHaveBeenCalledWith('event-evt-1')
    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
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
    expect(mockRedirect).toHaveBeenCalledWith('/organiser')
  })

  it('redirects to /organiser when the event is not found', async () => {
    mockEventFindUnique.mockResolvedValue(null)
    mockRedirect.mockImplementationOnce(() => { throw new Error('NEXT_REDIRECT') })

    await expect(cancelEventAction('evt-missing', 'reason')).rejects.toThrow('NEXT_REDIRECT')

    expect(mockEventUpdate).not.toHaveBeenCalled()
    expect(mockRedirect).toHaveBeenCalledWith('/organiser')
  })

  it('sends push notification to attendees on cancel', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1', title: 'Test Event' })
    mockEventUpdate.mockResolvedValue({})
    mockEventAttendeeFindMany.mockResolvedValue([{ userId: 'user-2' }])

    await cancelEventAction('evt-1', 'Venue unavailable')

    expect(mockQueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-2',
        type: NotificationType.EVENT_CANCELLED,
        title: 'Event Cancelled',
        body: expect.stringContaining('Test Event'),
        data: expect.objectContaining({ type: 'event_cancelled', eventId: 'evt-1' }),
        dedupeKey: 'cancelled:evt-1',
      })
    )
  })

  it('handles EVENT_CANCELLED push failure gracefully', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1', title: 'Test Event' })
    mockEventUpdate.mockResolvedValue({})
    mockEventAttendeeFindMany.mockResolvedValue([{ userId: 'user-2' }])
    mockQueueNotification.mockRejectedValueOnce(new Error('push failed'))

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
    expect(mockUpdateTag).toHaveBeenCalledWith('event-evt-1')
    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
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
  it('calls attendEvent DAL and invalidates event cache tags', async () => {
    await attendEventAction('evt-1')

    expect(mockAttendEvent).toHaveBeenCalledWith('evt-1', 'user-1')
    expect(mockUpdateTag).toHaveBeenCalledWith('event-evt-1')
  })

  it('returns an error from the DAL when the event is not found or a draft', async () => {
    mockAttendEvent.mockResolvedValue({ error: 'Event not found.' })

    const result = await attendEventAction('evt-1')

    expect(result.error).toBeDefined()
  })

  it('returns an error when the user is not signed in', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await attendEventAction('evt-1')

    expect(result.error).toBeDefined()
    expect(mockAttendEvent).not.toHaveBeenCalled()
  })
})

describe('unattendEventAction', () => {
  it('calls unattendEvent DAL and invalidates event cache tags', async () => {
    await unattendEventAction('evt-1')

    expect(mockUnattendEvent).toHaveBeenCalledWith('evt-1', 'user-1')
    expect(mockUpdateTag).toHaveBeenCalledWith('event-evt-1')
  })

  it('returns an error when the user is not signed in', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await unattendEventAction('evt-1')

    expect(result.error).toBeDefined()
    expect(mockUnattendEvent).not.toHaveBeenCalled()
  })
})

describe('registerEventAction', () => {
  it('calls registerEvent DAL with phone and notes, returns success', async () => {
    const result = await registerEventAction('evt-1', { phone: '07700000000', notes: 'Vegetarian' })

    expect(mockRegisterEvent).toHaveBeenCalledWith(
      'evt-1',
      'user-1',
      expect.objectContaining({ phone: '07700000000', notes: 'Vegetarian' })
    )
    expect(result.success).toBe(true)
    expect(mockUpdateTag).toHaveBeenCalledWith('event-evt-1')
  })

  it('calls registerEvent DAL with no optional fields when form is empty', async () => {
    const result = await registerEventAction('evt-1', {})

    expect(mockRegisterEvent).toHaveBeenCalledWith(
      'evt-1',
      'user-1',
      expect.objectContaining({ phone: undefined, notes: undefined })
    )
    expect(result.success).toBe(true)
  })

  it('returns an error when the user is not signed in', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await registerEventAction('evt-1', {})

    expect(result.error).toBeDefined()
    expect(mockRegisterEvent).not.toHaveBeenCalled()
  })

  it('returns a DAL error when the event is a draft or does not exist', async () => {
    mockRegisterEvent.mockResolvedValue({ error: 'Event not found.' })

    const result = await registerEventAction('evt-1', {})

    expect(result.error).toBeDefined()
  })

  it('returns a fully booked error from the DAL', async () => {
    mockRegisterEvent.mockResolvedValue({ error: 'Sorry, this event is fully booked.' })

    const result = await registerEventAction('evt-1', {})

    expect(result.error).toBe('Sorry, this event is fully booked.')
  })

  it('passes mapped responses to registerEvent', async () => {
    await registerEventAction('evt-1', {
      responses: {
        'q1': { answer: 'yes', fileUrl: null },
        'q2': { answer: null, fileUrl: 'https://example.com/file.pdf' },
      },
    })
    expect(mockRegisterEvent).toHaveBeenCalledWith(
      'evt-1',
      expect.any(String), // userId
      expect.objectContaining({
        responses: expect.arrayContaining([
          { questionId: 'q1', answer: 'yes', fileUrl: null },
          { questionId: 'q2', answer: null, fileUrl: 'https://example.com/file.pdf' },
        ]),
      })
    )
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
    expect(mockUpdateTag).toHaveBeenCalledWith('events')
    expect(mockUpdateTag).toHaveBeenCalledWith('event-evt-1')
    expect(mockUpdateTag).toHaveBeenCalledWith('church-ch-1')
    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
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
    const mockReschedule = jest.requireMock('@/lib/notifications/queue').rescheduleEventReminderNotifications as jest.Mock
    mockEventFindUnique.mockResolvedValue(existingPublished)
    mockEventUpdate.mockResolvedValue({})
    // Use a different date to trigger reschedule
    const newDate = '2026-05-10'

    await updateEventAction('evt-1', { ...validData, date: newDate })

    expect(mockReschedule).toHaveBeenCalledWith('evt-1', new Date(`${newDate}T${validData.time}`))
  })

  it('does not reschedule when the datetime is unchanged', async () => {
    const mockReschedule = jest.requireMock('@/lib/notifications/queue').rescheduleEventReminderNotifications as jest.Mock
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
    const mockReschedule = jest.requireMock('@/lib/notifications/queue').rescheduleEventReminderNotifications as jest.Mock
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
    const mockCancelAll = jest.requireMock('@/lib/notifications/queue').cancelManyNotifications as jest.Mock
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventDelete.mockResolvedValue({})

    await deleteEventAction('evt-1')

    expect(mockCancelAll).toHaveBeenCalledWith({ type: NotificationType.EVENT_REMINDER, dedupeKey: 'evt-1' })
    expect(mockEventDelete).toHaveBeenCalledWith({ where: { id: 'evt-1' } })
    expect(mockUpdateTag).toHaveBeenCalledWith('events')
    expect(mockUpdateTag).toHaveBeenCalledWith('event-evt-1')
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

  it('handles cancelManyNotifications failure gracefully', async () => {
    const mockCancelAll = jest.requireMock('@/lib/notifications/queue').cancelManyNotifications as jest.Mock
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventDelete.mockResolvedValue({})
    mockCancelAll.mockRejectedValueOnce(new Error('scheduler down'))

    await deleteEventAction('evt-1')

    expect(mockEventDelete).toHaveBeenCalledWith({ where: { id: 'evt-1' } })
    expect(mockRedirect).toHaveBeenCalledWith('/organiser')
  })
})

describe('publishEventAction', () => {
  const mockScheduleReminderNotif = jest.requireMock('@/lib/notifications/queue').scheduleEventReminderNotification as jest.Mock
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
    expect(mockScheduleReminderNotif).toHaveBeenCalledTimes(2)
    expect(mockScheduleReminderNotif).toHaveBeenCalledWith('user-2', { id: 'evt-1', title: 'Test', datetime })
    expect(mockScheduleReminderNotif).toHaveBeenCalledWith('user-3', { id: 'evt-1', title: 'Test', datetime })
    expect(mockUpdateTag).toHaveBeenCalledWith('events')
    expect(mockUpdateTag).toHaveBeenCalledWith('event-evt-1')
    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
  })

  it('schedules no reminders when there are no attendees', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1', seriesId: null, title: 'Test', isDraft: true, datetime: new Date() })
    mockEventUpdate.mockResolvedValue({})
    mockEventAttendeeFindMany.mockResolvedValue([])

    await publishEventAction('evt-1')

    expect(mockScheduleReminderNotif).not.toHaveBeenCalled()
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
    const datetime = new Date('2026-05-01T09:00:00Z')
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1', seriesId: 'ser-1', title: 'Bible Study', isDraft: true, datetime })
    mockEventUpdate.mockResolvedValue({})
    mockEventAttendeeFindMany.mockResolvedValue([])
    mockSeriesFollowerFindMany.mockResolvedValue([{ userId: 'follower-1' }, { userId: 'follower-2' }])

    await publishEventAction('evt-1')

    expect(mockQueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'follower-1',
        type: NotificationType.NEW_SERIES_SESSION,
        title: 'New Session Added',
        body: expect.stringContaining('Bible Study'),
        data: expect.objectContaining({ type: 'new_session', seriesId: 'ser-1', eventId: 'evt-1' }),
        dedupeKey: 'ser-1:evt-1',
      })
    )
  })

  it('handles reminder scheduling failure gracefully', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1', seriesId: null, title: 'Test', isDraft: true, datetime: new Date() })
    mockEventUpdate.mockResolvedValue({})
    mockEventAttendeeFindMany.mockResolvedValue([{ userId: 'user-2' }])
    mockScheduleReminderNotif.mockRejectedValueOnce(new Error('scheduler down'))

    await publishEventAction('evt-1')

    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
  })

  it('handles NEW_SERIES_SESSION push failure gracefully', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1', seriesId: 'ser-1', title: 'Test', isDraft: true, datetime: new Date() })
    mockEventUpdate.mockResolvedValue({})
    mockEventAttendeeFindMany.mockResolvedValue([])
    mockSeriesFollowerFindMany.mockResolvedValue([{ userId: 'follower-1' }])
    mockQueueNotification.mockRejectedValueOnce(new Error('push failed'))

    await publishEventAction('evt-1')

    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
  })
})

describe('extractResponses', () => {
  it('extracts a text response', () => {
    const fd = makeFormData({ 'response_q1': 'hello' })
    expect(extractResponses(fd)).toEqual([{ questionId: 'q1', answer: 'hello', fileUrl: null }])
  })

  it('extracts a file response', () => {
    const fd = makeFormData({ 'response_file_q1': 'https://blob.example.com/file.pdf' })
    expect(extractResponses(fd)).toEqual([{ questionId: 'q1', answer: null, fileUrl: 'https://blob.example.com/file.pdf' }])
  })

  it('converts empty string answer to null', () => {
    const fd = makeFormData({ 'response_q1': '' })
    expect(extractResponses(fd)).toEqual([{ questionId: 'q1', answer: null, fileUrl: null }])
  })

  it('converts empty string fileUrl to null (cleared file signal)', () => {
    const fd = makeFormData({ 'response_file_q1': '' })
    expect(extractResponses(fd)).toEqual([{ questionId: 'q1', answer: null, fileUrl: null }])
  })

  it('merges answer and fileUrl onto the same entry when both keys exist', () => {
    const fd = makeFormData({ 'response_q1': 'true', 'response_file_q1': 'https://blob.example.com/file.pdf' })
    expect(extractResponses(fd)).toEqual([
      { questionId: 'q1', answer: 'true', fileUrl: 'https://blob.example.com/file.pdf' },
    ])
  })

  it('handles multiple questions independently', () => {
    const fd = makeFormData({ 'response_q1': 'answer1', 'response_q2': 'answer2' })
    const result = extractResponses(fd)
    expect(result).toHaveLength(2)
    expect(result).toEqual(
      expect.arrayContaining([
        { questionId: 'q1', answer: 'answer1', fileUrl: null },
        { questionId: 'q2', answer: 'answer2', fileUrl: null },
      ])
    )
  })

  it('ignores non-response_ keys', () => {
    const fd = makeFormData({ phone: '07700', notes: 'veg', response_q1: 'yes' })
    expect(extractResponses(fd)).toEqual([{ questionId: 'q1', answer: 'yes', fileUrl: null }])
  })

  it('returns an empty array when no response_ keys are present', () => {
    const fd = makeFormData({ phone: '07700', notes: 'veg' })
    expect(extractResponses(fd)).toEqual([])
  })
})

describe('unpublishEventAction', () => {
  const mockCancelAll = jest.requireMock('@/lib/notifications/queue').cancelManyNotifications as jest.Mock

  it('sets isDraft to true, cancels pending reminders, and redirects to the event page', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventUpdate.mockResolvedValue({})

    await unpublishEventAction('evt-1')

    expect(mockEventUpdate).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      data: { isDraft: true },
    })
    expect(mockCancelAll).toHaveBeenCalledWith({ type: NotificationType.EVENT_REMINDER, dedupeKey: 'evt-1' })
    expect(mockUpdateTag).toHaveBeenCalledWith('events')
    expect(mockUpdateTag).toHaveBeenCalledWith('event-evt-1')
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

  it('handles cancelManyNotifications failure gracefully', async () => {
    mockEventFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventUpdate.mockResolvedValue({})
    mockCancelAll.mockRejectedValueOnce(new Error('scheduler down'))

    await unpublishEventAction('evt-1')

    expect(mockRedirect).toHaveBeenCalledWith('/events/evt-1')
  })
})
