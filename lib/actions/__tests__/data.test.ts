// Bypass React's cache() so functions behave as regular async functions in tests
jest.mock('react', () => ({
  cache: (fn: unknown) => fn,
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    event: { findMany: jest.fn(), findUnique: jest.fn() },
    church: { findMany: jest.fn(), findUnique: jest.fn() },
    series: { findMany: jest.fn(), findUnique: jest.fn() },
    churchOrganiser: { findMany: jest.fn() },
    churchAdmin: { findMany: jest.fn() },
  },
}))

import {
  getEvents,
  getPastEvents,
  getEventById,
  getChurches,
  getChurchById,
  getChurchesByOrganiser,
  getChurchesByAdmin,
  getChurchesByManager,
  getOrganisersByChurch,
  searchEventsAndChurches,
  getSeries,
  getSeriesById,
  getSeriesByChurchId,
  getEventsByCreator,
  getSeriesByCreator,
  getEventsNotByCreator,
  getSeriesNotByCreator,
} from '@/lib/actions/data'
import { prisma } from '@/lib/db'

const mockEventFindMany = prisma.event.findMany as jest.Mock
const mockEventFindUnique = prisma.event.findUnique as jest.Mock
const mockChurchFindMany = prisma.church.findMany as jest.Mock
const mockChurchFindUnique = prisma.church.findUnique as jest.Mock
const mockSeriesFindMany = prisma.series.findMany as jest.Mock
const mockSeriesFindUnique = prisma.series.findUnique as jest.Mock
const mockChurchOrganiserFindMany = prisma.churchOrganiser.findMany as jest.Mock
const mockChurchAdminFindMany = prisma.churchAdmin.findMany as jest.Mock

const sampleEvent = {
  id: 'evt-1',
  title: 'Sunday Service',
  datetime: '2026-03-16T09:00:00Z',
  location: 'Main Hall',
  host: 'Pastor John',
  tag: 'Worship',
  isPast: false,
  createdAt: new Date(),
}

const sampleChurch = {
  id: 'ch-1',
  name: 'Grace Church',
  denomination: 'Baptist',
  address: '123 Church St',
  serviceTimes: [],
  events: [],
}

const sampleSeries = {
  id: 'ser-1',
  name: 'Bible Study Series',
  description: 'Weekly Bible study',
  cadence: 'WEEKLY',
  location: 'Room 101',
  host: 'Pastor John',
  tag: 'Bible Study',
  churchId: 'ch-1',
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('getEvents', () => {
  it('returns upcoming events ordered by createdAt asc', async () => {
    mockEventFindMany.mockResolvedValue([sampleEvent])
    const result = await getEvents()
    expect(result).toEqual([sampleEvent])
    expect(mockEventFindMany).toHaveBeenCalledWith({
      where: { isPast: false },
      orderBy: { createdAt: 'asc' },
      include: { series: { select: { name: true } } },
    })
  })

  it('returns an empty array when there are no upcoming events', async () => {
    mockEventFindMany.mockResolvedValue([])
    expect(await getEvents()).toEqual([])
  })
})

describe('getPastEvents', () => {
  it('returns past events ordered by createdAt asc', async () => {
    const pastEvent = { ...sampleEvent, id: 'evt-past', isPast: true }
    mockEventFindMany.mockResolvedValue([pastEvent])
    const result = await getPastEvents()
    expect(result).toEqual([pastEvent])
    expect(mockEventFindMany).toHaveBeenCalledWith({
      where: { isPast: true },
      orderBy: { createdAt: 'asc' },
      include: { series: { select: { name: true } } },
    })
  })
})

describe('getEventById', () => {
  it('returns the matching event', async () => {
    mockEventFindUnique.mockResolvedValue(sampleEvent)
    const result = await getEventById('evt-1')
    expect(result).toEqual(sampleEvent)
    expect(mockEventFindUnique).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      include: {
        series: { select: { id: true, name: true } },
        attendees: { select: { userId: true } },
        _count: { select: { attendees: true } },
      },
    })
  })

  it('returns null when the event does not exist', async () => {
    mockEventFindUnique.mockResolvedValue(null)
    expect(await getEventById('not-found')).toBeNull()
  })
})

describe('getChurchesByAdmin', () => {
  it('returns the churches the admin is assigned to ordered by name', async () => {
    mockChurchAdminFindMany.mockResolvedValue([
      { church: { id: 'ch-1', name: 'Grace Church' } },
    ])

    const result = await getChurchesByAdmin('admin-1')

    expect(result).toEqual([{ id: 'ch-1', name: 'Grace Church' }])
    expect(mockChurchAdminFindMany).toHaveBeenCalledWith({
      where: { userId: 'admin-1' },
      select: { church: { select: { id: true, name: true } } },
      orderBy: { church: { name: 'asc' } },
    })
  })

  it('returns an empty array when the admin has no assigned churches', async () => {
    mockChurchAdminFindMany.mockResolvedValue([])
    expect(await getChurchesByAdmin('admin-none')).toEqual([])
  })
})

describe('getOrganisersByChurch', () => {
  it('returns organisers for a church ordered by name', async () => {
    mockChurchOrganiserFindMany.mockResolvedValue([
      { user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' } },
    ])

    const result = await getOrganisersByChurch('ch-1')

    expect(result).toEqual([{ id: 'user-1', name: 'Alice', email: 'alice@example.com' }])
    expect(mockChurchOrganiserFindMany).toHaveBeenCalledWith({
      where: { churchId: 'ch-1' },
      select: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: 'asc' } },
    })
  })

  it('returns an empty array when the church has no organisers', async () => {
    mockChurchOrganiserFindMany.mockResolvedValue([])
    expect(await getOrganisersByChurch('ch-none')).toEqual([])
  })
})

describe('getChurchesByManager', () => {
  it('merges and deduplicates churches from both organiser and admin tables, sorted by name', async () => {
    mockChurchOrganiserFindMany.mockResolvedValue([
      { church: { id: 'ch-1', name: 'Grace Church' } },
    ])
    mockChurchAdminFindMany.mockResolvedValue([
      { church: { id: 'ch-2', name: 'Harvest Church' } },
    ])

    const result = await getChurchesByManager('user-1')

    expect(result).toEqual([
      { id: 'ch-1', name: 'Grace Church' },
      { id: 'ch-2', name: 'Harvest Church' },
    ])
  })

  it('deduplicates when the same church appears in both tables', async () => {
    mockChurchOrganiserFindMany.mockResolvedValue([
      { church: { id: 'ch-1', name: 'Grace Church' } },
    ])
    mockChurchAdminFindMany.mockResolvedValue([
      { church: { id: 'ch-1', name: 'Grace Church' } },
    ])

    const result = await getChurchesByManager('user-1')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('ch-1')
  })

  it('returns empty array when user has no assignments in either table', async () => {
    mockChurchOrganiserFindMany.mockResolvedValue([])
    mockChurchAdminFindMany.mockResolvedValue([])

    expect(await getChurchesByManager('user-none')).toEqual([])
  })
})

describe('getChurchesByOrganiser', () => {
  it('returns the churches assigned to the organiser ordered by name', async () => {
    mockChurchOrganiserFindMany.mockResolvedValue([
      { church: { id: 'ch-1', name: 'Grace Church' } },
      { church: { id: 'ch-2', name: 'New Life Fellowship' } },
    ])

    const result = await getChurchesByOrganiser('user-1')

    expect(result).toEqual([
      { id: 'ch-1', name: 'Grace Church' },
      { id: 'ch-2', name: 'New Life Fellowship' },
    ])
    expect(mockChurchOrganiserFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { church: { select: { id: true, name: true } } },
      orderBy: { church: { name: 'asc' } },
    })
  })

  it('returns an empty array when the organiser has no assigned churches', async () => {
    mockChurchOrganiserFindMany.mockResolvedValue([])

    expect(await getChurchesByOrganiser('user-none')).toEqual([])
  })
})

describe('getChurches', () => {
  it('returns churches ordered by name with serviceTimes and events included', async () => {
    mockChurchFindMany.mockResolvedValue([sampleChurch])
    const result = await getChurches()
    expect(result).toEqual([sampleChurch])
    expect(mockChurchFindMany).toHaveBeenCalledWith({
      include: {
        serviceTimes: true,
        events: { where: { isPast: false } },
      },
      orderBy: { name: 'asc' },
    })
  })
})

describe('getChurchById', () => {
  it('returns the matching church', async () => {
    mockChurchFindUnique.mockResolvedValue(sampleChurch)
    const result = await getChurchById('ch-1')
    expect(result).toEqual(sampleChurch)
    expect(mockChurchFindUnique).toHaveBeenCalledWith({
      where: { id: 'ch-1' },
      include: {
        serviceTimes: true,
        events: { where: { isPast: false } },
        series: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { events: { where: { isPast: false } } } },
          },
        },
      },
    })
  })

  it('returns null when the church does not exist', async () => {
    mockChurchFindUnique.mockResolvedValue(null)
    expect(await getChurchById('missing')).toBeNull()
  })
})

describe('searchEventsAndChurches', () => {
  it('runs parallel queries for events and churches', async () => {
    mockEventFindMany.mockResolvedValue([sampleEvent])
    mockChurchFindMany.mockResolvedValue([sampleChurch])

    const result = await searchEventsAndChurches('grace')

    expect(result).toEqual({ events: [sampleEvent], churches: [sampleChurch] })
  })

  it('searches events across title, location, host, and tag fields', async () => {
    mockEventFindMany.mockResolvedValue([])
    mockChurchFindMany.mockResolvedValue([])

    await searchEventsAndChurches('worship')

    expect(mockEventFindMany).toHaveBeenCalledWith({
      where: {
        isPast: false,
        OR: [
          { title: { contains: 'worship', mode: 'insensitive' } },
          { location: { contains: 'worship', mode: 'insensitive' } },
          { host: { contains: 'worship', mode: 'insensitive' } },
          { tag: { contains: 'worship', mode: 'insensitive' } },
        ],
      },
      include: { series: { select: { name: true } } },
    })
  })

  it('searches churches across name, denomination, and address fields', async () => {
    mockEventFindMany.mockResolvedValue([])
    mockChurchFindMany.mockResolvedValue([])

    await searchEventsAndChurches('baptist')

    expect(mockChurchFindMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: 'baptist', mode: 'insensitive' } },
          { denomination: { contains: 'baptist', mode: 'insensitive' } },
          { address: { contains: 'baptist', mode: 'insensitive' } },
        ],
      },
    })
  })

  it('returns empty arrays when nothing matches', async () => {
    mockEventFindMany.mockResolvedValue([])
    mockChurchFindMany.mockResolvedValue([])

    expect(await searchEventsAndChurches('zzznomatch')).toEqual({
      events: [],
      churches: [],
    })
  })
})

describe('getSeries', () => {
  it('returns all series ordered by createdAt desc with event count', async () => {
    const seriesWithCount = { ...sampleSeries, _count: { events: 3 } }
    mockSeriesFindMany.mockResolvedValue([seriesWithCount])

    const result = await getSeries()

    expect(result).toEqual([seriesWithCount])
    expect(mockSeriesFindMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { events: { where: { isPast: false } } },
        },
      },
    })
  })

  it('returns empty array when no series exist', async () => {
    mockSeriesFindMany.mockResolvedValue([])
    expect(await getSeries()).toEqual([])
  })
})

describe('getSeriesById', () => {
  it('returns the matching series with church and upcoming events', async () => {
    const fullSeries = {
      ...sampleSeries,
      church: { id: 'ch-1', name: 'Grace Church' },
      events: [sampleEvent],
    }
    mockSeriesFindUnique.mockResolvedValue(fullSeries)

    const result = await getSeriesById('ser-1')

    expect(result).toEqual(fullSeries)
    expect(mockSeriesFindUnique).toHaveBeenCalledWith({
      where: { id: 'ser-1' },
      include: {
        church: { select: { id: true, name: true } },
        events: {
          where: { isPast: false },
          orderBy: { datetime: 'asc' },
        },
      },
    })
  })

  it('returns null when series does not exist', async () => {
    mockSeriesFindUnique.mockResolvedValue(null)
    expect(await getSeriesById('not-found')).toBeNull()
  })
})

describe('getSeriesByChurchId', () => {
  it('returns series for the given church with event count', async () => {
    const seriesWithCount = { ...sampleSeries, _count: { events: 2 } }
    mockSeriesFindMany.mockResolvedValue([seriesWithCount])

    const result = await getSeriesByChurchId('ch-1')

    expect(result).toEqual([seriesWithCount])
    expect(mockSeriesFindMany).toHaveBeenCalledWith({
      where: { churchId: 'ch-1' },
      include: {
        _count: {
          select: { events: { where: { isPast: false } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('returns empty array when church has no series', async () => {
    mockSeriesFindMany.mockResolvedValue([])
    expect(await getSeriesByChurchId('ch-none')).toEqual([])
  })
})

describe('getEventsByCreator', () => {
  it('returns upcoming events created by the given user', async () => {
    mockEventFindMany.mockResolvedValue([sampleEvent])
    const result = await getEventsByCreator('user-1')
    expect(result).toEqual([sampleEvent])
    expect(mockEventFindMany).toHaveBeenCalledWith({
      where: { isPast: false, createdById: 'user-1' },
      orderBy: { createdAt: 'asc' },
      include: {
        series: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    })
  })

  it('returns empty array when the user has no events', async () => {
    mockEventFindMany.mockResolvedValue([])
    expect(await getEventsByCreator('user-none')).toEqual([])
  })
})

describe('getSeriesByCreator', () => {
  it('returns series created by the given user', async () => {
    const seriesWithCount = { ...sampleSeries, _count: { events: 2 }, createdBy: { name: 'Alice' } }
    mockSeriesFindMany.mockResolvedValue([seriesWithCount])
    const result = await getSeriesByCreator('user-1')
    expect(result).toEqual([seriesWithCount])
    expect(mockSeriesFindMany).toHaveBeenCalledWith({
      where: { createdById: 'user-1' },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { events: { where: { isPast: false } } } },
        createdBy: { select: { name: true } },
      },
    })
  })

  it('returns empty array when the user has no series', async () => {
    mockSeriesFindMany.mockResolvedValue([])
    expect(await getSeriesByCreator('user-none')).toEqual([])
  })
})

describe('getEventsNotByCreator', () => {
  it('returns upcoming events not created by the given user', async () => {
    mockEventFindMany.mockResolvedValue([sampleEvent])
    const result = await getEventsNotByCreator('user-1')
    expect(result).toEqual([sampleEvent])
    expect(mockEventFindMany).toHaveBeenCalledWith({
      where: {
        isPast: false,
        OR: [{ createdById: { not: 'user-1' } }, { createdById: null }],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        series: { select: { name: true } },
        createdBy: { select: { name: true } },
      },
    })
  })

  it('returns empty array when no other events exist', async () => {
    mockEventFindMany.mockResolvedValue([])
    expect(await getEventsNotByCreator('user-1')).toEqual([])
  })
})

describe('getSeriesNotByCreator', () => {
  it('returns series not created by the given user', async () => {
    const seriesWithCount = { ...sampleSeries, _count: { events: 1 }, createdBy: { name: 'Bob' } }
    mockSeriesFindMany.mockResolvedValue([seriesWithCount])
    const result = await getSeriesNotByCreator('user-1')
    expect(result).toEqual([seriesWithCount])
    expect(mockSeriesFindMany).toHaveBeenCalledWith({
      where: {
        OR: [{ createdById: { not: 'user-1' } }, { createdById: null }],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { events: { where: { isPast: false } } } },
        createdBy: { select: { name: true } },
      },
    })
  })

  it('returns empty array when no other series exist', async () => {
    mockSeriesFindMany.mockResolvedValue([])
    expect(await getSeriesNotByCreator('user-1')).toEqual([])
  })
})
