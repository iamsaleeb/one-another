jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    event: {
      create: jest.fn(),
    },
  },
}))

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

import { redirect } from 'next/navigation'
import { createEventAction } from '@/lib/actions/events'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'

const mockRedirect = redirect as unknown as jest.Mock
const mockEventCreate = prisma.event.create as jest.Mock
const mockAuth = auth as jest.Mock

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  return fd
}

const validFields = {
  title: 'Sunday Worship',
  date: '2026-04-06',
  time: '09:00',
  location: 'Main Hall',
  host: 'Pastor John',
  tag: 'Worship',
  description: 'Weekly Sunday service',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
})

describe('createEventAction', () => {
  it('creates an event and redirects to my-events', async () => {
    mockEventCreate.mockResolvedValue({ id: 'evt-1' })

    await createEventAction({}, makeFormData(validFields))

    expect(mockEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Sunday Worship',
        datetime: '2026-04-06T09:00',
        location: 'Main Hall',
        host: 'Pastor John',
        tag: 'Worship',
        description: 'Weekly Sunday service',
        isPast: false,
        createdById: 'user-1',
      }),
    })
    expect(mockRedirect).toHaveBeenCalledWith('/my-events')
  })

  it('redirects to the series page when seriesId is provided', async () => {
    mockEventCreate.mockResolvedValue({ id: 'evt-2' })

    await createEventAction({}, makeFormData({ ...validFields, seriesId: 'ser-1' }))

    expect(mockEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ seriesId: 'ser-1' }),
    })
    expect(mockRedirect).toHaveBeenCalledWith('/series/ser-1')
  })

  it('includes churchId when provided', async () => {
    mockEventCreate.mockResolvedValue({ id: 'evt-3' })

    await createEventAction({}, makeFormData({ ...validFields, churchId: 'ch-1' }))

    expect(mockEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ churchId: 'ch-1' }),
    })
  })

  it('does not include churchId when the field is empty', async () => {
    mockEventCreate.mockResolvedValue({ id: 'evt-4' })

    await createEventAction({}, makeFormData({ ...validFields, churchId: '' }))

    const callArg = mockEventCreate.mock.calls[0][0]
    expect(callArg.data).not.toHaveProperty('churchId')
  })

  it('returns fieldErrors when required fields are missing', async () => {
    const result = await createEventAction({}, makeFormData({ title: '' }))

    expect(result.fieldErrors).toBeDefined()
    expect(result.fieldErrors?.title).toBeDefined()
    expect(mockEventCreate).not.toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('does not include createdById when no session user', async () => {
    mockAuth.mockResolvedValue(null)
    mockEventCreate.mockResolvedValue({ id: 'evt-5' })

    await createEventAction({}, makeFormData(validFields))

    const callArg = mockEventCreate.mock.calls[0][0]
    expect(callArg.data).not.toHaveProperty('createdById')
  })
})
