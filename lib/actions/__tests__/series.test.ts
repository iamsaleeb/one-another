jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    series: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/permissions', () => ({
  isOrganiserForChurch: jest.fn(),
}))

import { redirect } from 'next/navigation'
import { createSeriesAction } from '@/lib/actions/series'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { isOrganiserForChurch } from '@/lib/permissions'

const mockRedirect = redirect as unknown as jest.Mock
const mockSeriesCreate = prisma.series.create as jest.Mock
const mockAuth = auth as jest.Mock
const mockIsOrganiserForChurch = isOrganiserForChurch as jest.Mock

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    fd.append(key, value)
  }
  return fd
}

const validFields = {
  name: 'Weekly Bible Study',
  description: 'A weekly deep dive into scripture',
  cadence: 'WEEKLY',
  location: 'Room 101',
  host: 'Pastor John',
  tag: 'Bible Study',
  churchId: 'ch-1',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ORGANISER' } })
  mockIsOrganiserForChurch.mockResolvedValue(true)
})

describe('createSeriesAction', () => {
  it('creates a series and redirects to its detail page', async () => {
    mockSeriesCreate.mockResolvedValue({ id: 'ser-1', ...validFields })

    await createSeriesAction({}, makeFormData(validFields))

    expect(mockSeriesCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Weekly Bible Study',
        cadence: 'WEEKLY',
        location: 'Room 101',
        host: 'Pastor John',
        tag: 'Bible Study',
        churchId: 'ch-1',
      }),
    })
    expect(mockRedirect).toHaveBeenCalledWith('/series/ser-1')
  })

  it('includes churchId in the create call when provided', async () => {
    mockSeriesCreate.mockResolvedValue({ id: 'ser-2', ...validFields, churchId: 'ch-99' })

    await createSeriesAction({}, makeFormData({ ...validFields, churchId: 'ch-99' }))

    expect(mockSeriesCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ churchId: 'ch-99' }),
    })
  })

  it('returns fieldErrors when required fields are missing', async () => {
    const result = await createSeriesAction({}, makeFormData({ name: '' }))

    expect(result.fieldErrors).toBeDefined()
    expect(result.fieldErrors?.name).toBeDefined()
    expect(mockSeriesCreate).not.toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('returns a fieldError for an invalid cadence value', async () => {
    const result = await createSeriesAction(
      {},
      makeFormData({ ...validFields, cadence: 'DAILY' })
    )

    expect(result.fieldErrors?.cadence).toBeDefined()
    expect(mockSeriesCreate).not.toHaveBeenCalled()
  })

  it('returns a fieldError when churchId is empty', async () => {
    const result = await createSeriesAction(
      {},
      makeFormData({ ...validFields, churchId: '' })
    )

    expect(result.fieldErrors?.churchId).toBeDefined()
    expect(mockSeriesCreate).not.toHaveBeenCalled()
  })

  it('returns an unauthorized error when there is no session', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await createSeriesAction({}, makeFormData(validFields))

    expect(result.error).toBeDefined()
    expect(mockSeriesCreate).not.toHaveBeenCalled()
  })

  it('returns an unauthorized error when the user is not an organiser', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1', role: 'ATTENDEE' } })

    const result = await createSeriesAction({}, makeFormData(validFields))

    expect(result.error).toBeDefined()
    expect(mockSeriesCreate).not.toHaveBeenCalled()
  })

  it('returns an error when organiser is not assigned to the church', async () => {
    mockIsOrganiserForChurch.mockResolvedValue(false)

    const result = await createSeriesAction({}, makeFormData(validFields))

    expect(result.error).toBe('You are not assigned to this church.')
    expect(mockSeriesCreate).not.toHaveBeenCalled()
  })
})
