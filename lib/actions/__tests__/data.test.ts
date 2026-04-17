jest.mock('next/cache', () => ({
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    event: { findMany: jest.fn(), findUnique: jest.fn() },
    church: { findMany: jest.fn(), findUnique: jest.fn() },
    series: { findMany: jest.fn(), findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    churchOrganiser: { findMany: jest.fn() },
    churchAdmin: { findMany: jest.fn() },
    churchFollower: { findMany: jest.fn() },
    eventAttendee: { findMany: jest.fn() },
  },
}))

import {
  getEvents,
  getEventById,
  getEventsByCreator,
  getEventsNotByCreator,
  getEventAttendees,
  getUserAttendedEvents,
  getUserAttendedPastEvents,
} from '@/lib/actions/data-events'
import {
  getChurches,
  getChurchById,
  getChurchesByManager,
  getOrganisersByChurch,
} from '@/lib/actions/data-churches'
import {
  getSeries,
  getSeriesById,
  getSeriesByCreator,
  getSeriesNotByCreator,
  getUserFollowedSeries,
  getSeriesForEvent,
} from '@/lib/actions/data-series'
import {
  searchEventsAndChurches,
  getProfileUser,
} from '@/lib/actions/data-user'
import { prisma } from '@/lib/db'

const mockEventFindMany = prisma.event.findMany as jest.Mock
const mockEventFindUnique = prisma.event.findUnique as jest.Mock
const mockChurchFindMany = prisma.church.findMany as jest.Mock
const mockChurchFindUnique = prisma.church.findUnique as jest.Mock
const mockSeriesFindMany = prisma.series.findMany as jest.Mock
const mockSeriesFindUnique = prisma.series.findUnique as jest.Mock
const mockChurchOrganiserFindMany = prisma.churchOrganiser.findMany as jest.Mock
const mockChurchAdminFindMany = prisma.churchAdmin.findMany as jest.Mock
const mockEventAttendeeFindMany = prisma.eventAttendee.findMany as jest.Mock
const mockUserFindUnique = prisma.user.findUnique as jest.Mock

const sampleEvent = {
  id: 'evt-1',
  title: 'Sunday Service',
  datetime: '2026-03-16T09:00:00Z',
  location: 'Main Hall',
  host: 'Pastor John',
  tag: 'Youth Meeting',
  isPast: false,
  createdAt: new Date(),
}

const sampleChurch = {
  id: 'ch-1',
  name: 'Grace Church',
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
      where: { isPast: false, isDraft: false },
      orderBy: { createdAt: 'asc' },
      include: { series: { select: { name: true } } },
    })
  })

  it('returns an empty array when there are no upcoming events', async () => {
    mockEventFindMany.mockResolvedValue([])
    expect(await getEvents()).toEqual([])
  })
})

describe('getEventById', () => {
  it('returns the matching event without userId (no attendees fetched)', async () => {
    mockEventFindUnique.mockResolvedValue(sampleEvent)
    const result = await getEventById('evt-1')
    expect(result).toEqual(sampleEvent)
    expect(mockEventFindUnique).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      include: {
        series: { select: { id: true, name: true } },
        attendees: { take: 0, select: { userId: true } },
        _count: { select: { attendees: true } },
      },
    })
  })

  it('filters attendees to the current user when userId provided', async () => {
    mockEventFindUnique.mockResolvedValue(sampleEvent)
    await getEventById('evt-1', 'user-1')
    expect(mockEventFindUnique).toHaveBeenCalledWith({
      where: { id: 'evt-1' },
      include: {
        series: { select: { id: true, name: true } },
        attendees: { where: { userId: 'user-1' }, select: { userId: true } },
        _count: { select: { attendees: true } },
      },
    })
  })

  it('returns null when the event does not exist', async () => {
    mockEventFindUnique.mockResolvedValue(null)
    expect(await getEventById('not-found')).toBeNull()
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

describe('getChurches', () => {
  it('returns churches ordered by name with only id and name selected', async () => {
    const minimalChurch = { id: 'ch-1', name: 'Grace Church' }
    mockChurchFindMany.mockResolvedValue([minimalChurch])
    const result = await getChurches()
    expect(result).toEqual([minimalChurch])
    expect(mockChurchFindMany).toHaveBeenCalledWith({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
  })
})

describe('getChurchById', () => {
  it('returns the matching church without userId (no followers fetched)', async () => {
    mockChurchFindUnique.mockResolvedValue(sampleChurch)
    const result = await getChurchById('ch-1')
    expect(result).toEqual(sampleChurch)
    expect(mockChurchFindUnique).toHaveBeenCalledWith({
      where: { id: 'ch-1' },
      include: {
        serviceTimes: true,
        events: { where: { isPast: false, isDraft: false } },
        series: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { events: { where: { isPast: false, isDraft: false } } } },
          },
        },
        followers: { take: 0, select: { userId: true } },
        _count: { select: { followers: true } },
      },
    })
  })

  it('filters followers to the current user when userId provided', async () => {
    mockChurchFindUnique.mockResolvedValue(sampleChurch)
    await getChurchById('ch-1', 'user-1')
    expect(mockChurchFindUnique).toHaveBeenCalledWith({
      where: { id: 'ch-1' },
      include: {
        serviceTimes: true,
        events: { where: { isPast: false, isDraft: false } },
        series: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { events: { where: { isPast: false, isDraft: false } } } },
          },
        },
        followers: { where: { userId: 'user-1' }, select: { userId: true } },
        _count: { select: { followers: true } },
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

    const result = await searchEventsAndChurches({ query: 'grace' })

    expect(result).toEqual({ events: [sampleEvent], churches: [sampleChurch] })
  })

  it('searches events across title, location, host, and tag fields', async () => {
    mockEventFindMany.mockResolvedValue([])
    mockChurchFindMany.mockResolvedValue([])

    await searchEventsAndChurches({ query: 'worship' })

    expect(mockEventFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isPast: false,
          OR: [
            { title: { contains: 'worship', mode: 'insensitive' } },
            { location: { contains: 'worship', mode: 'insensitive' } },
            { host: { contains: 'worship', mode: 'insensitive' } },
            { tag: { contains: 'worship', mode: 'insensitive' } },
          ],
        }),
      })
    )
  })

  it('searches churches across name and address fields', async () => {
    mockEventFindMany.mockResolvedValue([])
    mockChurchFindMany.mockResolvedValue([])

    await searchEventsAndChurches({ query: 'baptist' })

    expect(mockChurchFindMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { name: { contains: 'baptist', mode: 'insensitive' } },
          { address: { contains: 'baptist', mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, address: true },
    })
  })

  it('returns empty arrays when nothing matches', async () => {
    mockEventFindMany.mockResolvedValue([])
    mockChurchFindMany.mockResolvedValue([])

    expect(await searchEventsAndChurches({ query: 'zzznomatch' })).toEqual({
      events: [],
      churches: [],
    })
  })

  it('returns empty arrays when no filters provided', async () => {
    expect(await searchEventsAndChurches({ query: '' })).toEqual({
      events: [],
      churches: [],
    })
  })

  it('filters events by type=events only', async () => {
    mockEventFindMany.mockResolvedValue([sampleEvent])

    const result = await searchEventsAndChurches({ query: 'grace', type: 'events' })

    expect(result.churches).toEqual([])
    expect(mockChurchFindMany).not.toHaveBeenCalled()
  })

  it('filters to churches only when type=churches', async () => {
    mockChurchFindMany.mockResolvedValue([sampleChurch])

    const result = await searchEventsAndChurches({ query: 'grace', type: 'churches' })

    expect(result.events).toEqual([])
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
          select: { events: { where: { isPast: false, isDraft: false } } },
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
  it('returns the matching series without userId (no followers fetched)', async () => {
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
          where: { isPast: false, isDraft: false },
          orderBy: { datetime: 'asc' },
        },
        followers: { take: 0, select: { userId: true } },
        _count: { select: { followers: true } },
      },
    })
  })

  it('filters followers to the current user when userId provided', async () => {
    mockSeriesFindUnique.mockResolvedValue(null)
    await getSeriesById('ser-1', 'user-1')
    expect(mockSeriesFindUnique).toHaveBeenCalledWith({
      where: { id: 'ser-1' },
      include: {
        church: { select: { id: true, name: true } },
        events: {
          where: { isPast: false, isDraft: false },
          orderBy: { datetime: 'asc' },
        },
        followers: { where: { userId: 'user-1' }, select: { userId: true } },
        _count: { select: { followers: true } },
      },
    })
  })

  it('returns null when series does not exist', async () => {
    mockSeriesFindUnique.mockResolvedValue(null)
    expect(await getSeriesById('not-found')).toBeNull()
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
        _count: { select: { events: { where: { isPast: false, isDraft: false } } } },
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
        isDraft: false,
        OR: [{ createdById: { not: 'user-1' } }, { createdById: null }],
      },
      orderBy: { datetime: 'asc' },
      take: 50,
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
      take: 50,
      include: {
        _count: { select: { events: { where: { isPast: false, isDraft: false } } } },
        createdBy: { select: { name: true } },
      },
    })
  })

  it('returns empty array when no other series exist', async () => {
    mockSeriesFindMany.mockResolvedValue([])
    expect(await getSeriesNotByCreator('user-1')).toEqual([])
  })
})

describe('getEventAttendees', () => {
  const sampleAttendees = [
    {
      id: 'ea-1',
      phone: '+61400000000',
      notes: 'Vegetarian',
      metadata: null,
      user: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
    },
    {
      id: 'ea-2',
      phone: null,
      notes: null,
      metadata: null,
      user: { id: 'user-2', name: 'Bob', email: 'bob@example.com' },
    },
  ]

  it('returns attendees for the given event ordered by createdAt asc', async () => {
    mockEventAttendeeFindMany.mockResolvedValue(sampleAttendees)

    const result = await getEventAttendees('evt-1')

    expect(result).toEqual(sampleAttendees)
    expect(mockEventAttendeeFindMany).toHaveBeenCalledWith({
      where: { eventId: 'evt-1' },
      select: {
        id: true,
        phone: true,
        notes: true,
        metadata: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  })

  it('returns an empty array when no one has registered', async () => {
    mockEventAttendeeFindMany.mockResolvedValue([])

    const result = await getEventAttendees('evt-empty')

    expect(result).toEqual([])
    expect(mockEventAttendeeFindMany).toHaveBeenCalledWith({
      where: { eventId: 'evt-empty' },
      select: {
        id: true,
        phone: true,
        notes: true,
        metadata: true,
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
  })
})

describe('getUserAttendedEvents', () => {
  it('returns upcoming events attended by the given user ordered by datetime asc', async () => {
    mockEventFindMany.mockResolvedValue([sampleEvent])
    const result = await getUserAttendedEvents('user-1')
    expect(result).toEqual([sampleEvent])
    expect(mockEventFindMany).toHaveBeenCalledWith({
      where: { isPast: false, isDraft: false, attendees: { some: { userId: 'user-1' } } },
      orderBy: { datetime: 'asc' },
      include: { series: { select: { name: true } } },
    })
  })

  it('returns empty array when the user has no upcoming attended events', async () => {
    mockEventFindMany.mockResolvedValue([])
    expect(await getUserAttendedEvents('user-none')).toEqual([])
  })
})

describe('getUserAttendedPastEvents', () => {
  it('returns past events attended by the given user ordered by datetime desc', async () => {
    const pastEvent = { ...sampleEvent, id: 'evt-past', isPast: true }
    mockEventFindMany.mockResolvedValue([pastEvent])
    const result = await getUserAttendedPastEvents('user-1')
    expect(result).toEqual([pastEvent])
    expect(mockEventFindMany).toHaveBeenCalledWith({
      where: { isPast: true, isDraft: false, attendees: { some: { userId: 'user-1' } } },
      orderBy: { datetime: 'desc' },
      include: { series: { select: { name: true } } },
    })
  })

  it('returns empty array when the user has no past attended events', async () => {
    mockEventFindMany.mockResolvedValue([])
    expect(await getUserAttendedPastEvents('user-none')).toEqual([])
  })
})

describe('getUserFollowedSeries', () => {
  it('returns series followed by the given user with upcoming event count', async () => {
    const seriesWithCount = { ...sampleSeries, _count: { events: 4 } }
    mockSeriesFindMany.mockResolvedValue([seriesWithCount])
    const result = await getUserFollowedSeries('user-1')
    expect(result).toEqual([seriesWithCount])
    expect(mockSeriesFindMany).toHaveBeenCalledWith({
      where: { followers: { some: { userId: 'user-1' } } },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { events: { where: { isPast: false, isDraft: false } } } },
      },
    })
  })

  it('returns empty array when the user follows no series', async () => {
    mockSeriesFindMany.mockResolvedValue([])
    expect(await getUserFollowedSeries('user-none')).toEqual([])
  })
})

describe('getProfileUser', () => {
  it('returns phone and dateOfBirth for the given user', async () => {
    const profileData = { phone: '+61400000000', dateOfBirth: new Date('1990-01-01') }
    mockUserFindUnique.mockResolvedValue(profileData)

    const result = await getProfileUser('user-1')

    expect(result).toEqual(profileData)
    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { phone: true, dateOfBirth: true },
    })
  })

  it('returns null when the user does not exist', async () => {
    mockUserFindUnique.mockResolvedValue(null)
    expect(await getProfileUser('user-missing')).toBeNull()
  })
})

describe('getSeriesForEvent', () => {
  it('returns slim series data for event creation', async () => {
    const seriesData = {
      id: 'ser-1',
      name: 'Bible Study Series',
      church: { id: 'ch-1', name: 'Grace Church' },
    }
    mockSeriesFindUnique.mockResolvedValue(seriesData)

    const result = await getSeriesForEvent('ser-1')

    expect(result).toEqual(seriesData)
    expect(mockSeriesFindUnique).toHaveBeenCalledWith({
      where: { id: 'ser-1' },
      select: { id: true, name: true, church: { select: { id: true, name: true } } },
    })
  })

  it('returns null when the series does not exist', async () => {
    mockSeriesFindUnique.mockResolvedValue(null)
    expect(await getSeriesForEvent('ser-missing')).toBeNull()
  })
})
