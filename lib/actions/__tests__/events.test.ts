jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    event: {
      create: jest.fn(),
    },
    series: {
      findUnique: jest.fn(),
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
const mockSeriesFindUnique = prisma.series.findUnique as jest.Mock
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
  churchId: 'ch-1',
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
        churchId: 'ch-1',
        createdById: 'user-1',
      }),
    })
    expect(mockRedirect).toHaveBeenCalledWith('/my-events')
  })

  it('redirects to the series page when seriesId is provided', async () => {
    mockSeriesFindUnique.mockResolvedValue({ churchId: 'ch-1' })
    mockEventCreate.mockResolvedValue({ id: 'evt-2' })

    await createEventAction({}, makeFormData({ ...validFields, seriesId: 'ser-1' }))

    expect(mockSeriesFindUnique).toHaveBeenCalledWith({
      where: { id: 'ser-1' },
      select: { churchId: true },
    })
    expect(mockEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ seriesId: 'ser-1', churchId: 'ch-1' }),
    })
    expect(mockRedirect).toHaveBeenCalledWith('/series/ser-1')
  })

  it('inherits churchId from the series, ignoring any submitted churchId', async () => {
    mockSeriesFindUnique.mockResolvedValue({ churchId: 'ch-from-series' })
    mockEventCreate.mockResolvedValue({ id: 'evt-3' })

    await createEventAction(
      {},
      makeFormData({ ...validFields, seriesId: 'ser-1', churchId: 'ch-submitted' })
    )

    expect(mockEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ churchId: 'ch-from-series' }),
    })
  })

  it('includes churchId when provided for a standalone event', async () => {
    mockEventCreate.mockResolvedValue({ id: 'evt-4' })

    await createEventAction({}, makeFormData({ ...validFields, churchId: 'ch-99' }))

    expect(mockEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ churchId: 'ch-99' }),
    })
  })

  it('returns a fieldError when churchId is empty for a standalone event', async () => {
    const { churchId: _, ...fieldsWithoutChurch } = validFields
    const result = await createEventAction(
      {},
      makeFormData({ ...fieldsWithoutChurch, churchId: '' })
    )

    expect(result.fieldErrors?.churchId).toBeDefined()
    expect(mockEventCreate).not.toHaveBeenCalled()
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
