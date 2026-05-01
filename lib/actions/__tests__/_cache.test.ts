jest.mock('next/cache', () => ({
  updateTag: jest.fn(),
}))

import { updateTag } from 'next/cache'
import {
  invalidateEventFields,
  invalidateEventUpdate,
  invalidateSeriesFields,
} from '@/lib/actions/_cache'

const mockUpdateTag = updateTag as jest.Mock

beforeEach(() => mockUpdateTag.mockClear())

describe('invalidateEventFields', () => {
  it('fires series tag when seriesId provided', () => {
    invalidateEventFields('evt-1', null, 'ser-1')
    expect(mockUpdateTag).toHaveBeenCalledWith('series-ser-1')
  })
})

describe('invalidateEventUpdate', () => {
  it('fires new church tag when newChurchId differs from oldChurchId', () => {
    invalidateEventUpdate('evt-1', 'church-old', 'church-new', [])
    expect(mockUpdateTag).toHaveBeenCalledWith('church-church-new')
  })

  it('does not fire new church tag when newChurchId equals oldChurchId', () => {
    invalidateEventUpdate('evt-1', 'church-1', 'church-1', [])
    const newChurchCalls = mockUpdateTag.mock.calls.filter(([t]) => t === 'church-church-1')
    expect(newChurchCalls).toHaveLength(1) // once via invalidateEventFields, not twice
  })
})

describe('invalidateSeriesFields', () => {
  it('fires new church tag when newChurchId differs from oldChurchId', () => {
    invalidateSeriesFields('ser-1', 'church-old', 'church-new')
    expect(mockUpdateTag).toHaveBeenCalledWith('church-church-new')
  })

  it('does not fire new church tag when newChurchId equals oldChurchId', () => {
    invalidateSeriesFields('ser-1', 'church-1', 'church-1')
    const newChurchCalls = mockUpdateTag.mock.calls.filter(([t]) => t === 'church-church-1')
    expect(newChurchCalls).toHaveLength(1) // only old church, not double-fired
  })
})
