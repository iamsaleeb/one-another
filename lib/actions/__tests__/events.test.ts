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
  cancelEventAction,
  uncancelEventAction,
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
const mockEventAttendeeCreate = prisma.eventAttendee.create as jest.Mock
const mockEventAttendeeDelete = prisma.eventAttendee.delete as jest.Mock
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
  tag: 'Worship',
  description: 'Weekly Sunday service',
  churchId: 'ch-1',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ORGANISER' } })
  mockCanManageChurch.mockResolvedValue(true)
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
          tag: 'Worship',
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
  it('creates an EventAttendee and revalidates the event path', async () => {
    mockEventAttendeeCreate.mockResolvedValue({})

    await attendEventAction('evt-1')

    expect(mockEventAttendeeCreate).toHaveBeenCalledWith({
      data: { eventId: 'evt-1', userId: 'user-1' },
    })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/events/evt-1')
  })

  it('returns an error when the user is not signed in', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await attendEventAction('evt-1')

    expect(result.error).toBeDefined()
    expect(mockEventAttendeeCreate).not.toHaveBeenCalled()
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
})

describe('registerEventAction', () => {
  it('creates an EventAttendee with phone and notes', async () => {
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

  it('allows registration when capacity is not set', async () => {
    mockEventFindUnique.mockResolvedValue({ capacity: null, _count: { attendees: 10 } })
    mockEventAttendeeCreate.mockResolvedValue({})

    const result = await registerEventAction('evt-1', {}, makeFormData({}))

    expect(result.success).toBe(true)
    expect(mockEventAttendeeCreate).toHaveBeenCalled()
  })

  it('allows registration when spots are still available', async () => {
    mockEventFindUnique.mockResolvedValue({ capacity: 10, _count: { attendees: 9 } })
    mockEventAttendeeCreate.mockResolvedValue({})

    const result = await registerEventAction('evt-1', {}, makeFormData({}))

    expect(result.success).toBe(true)
    expect(mockEventAttendeeCreate).toHaveBeenCalled()
  })

  it('returns a fully booked error when capacity is reached', async () => {
    mockEventFindUnique.mockResolvedValue({ capacity: 10, _count: { attendees: 10 } })

    const result = await registerEventAction('evt-1', {}, makeFormData({}))

    expect(result.error).toBe('Sorry, this event is fully booked.')
    expect(mockEventAttendeeCreate).not.toHaveBeenCalled()
  })
})
