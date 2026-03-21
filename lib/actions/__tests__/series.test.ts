jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    series: {
      create: jest.fn(),
    },
  },
}))

import { redirect } from 'next/navigation'
import { createSeriesAction } from '@/lib/actions/series'
import { prisma } from '@/lib/db'

const mockRedirect = redirect as unknown as jest.Mock
const mockSeriesCreate = prisma.series.create as jest.Mock

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
}

beforeEach(() => {
  jest.clearAllMocks()
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
      }),
    })
    expect(mockRedirect).toHaveBeenCalledWith('/series/ser-1')
  })

  it('includes churchId in the create call when provided', async () => {
    mockSeriesCreate.mockResolvedValue({ id: 'ser-2', ...validFields, churchId: 'ch-1' })

    await createSeriesAction({}, makeFormData({ ...validFields, churchId: 'ch-1' }))

    expect(mockSeriesCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ churchId: 'ch-1' }),
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

  it('does not include churchId when the field is empty', async () => {
    mockSeriesCreate.mockResolvedValue({ id: 'ser-3', ...validFields })

    await createSeriesAction({}, makeFormData({ ...validFields, churchId: '' }))

    const callArg = mockSeriesCreate.mock.calls[0][0]
    expect(callArg.data).not.toHaveProperty('churchId')
  })
})
