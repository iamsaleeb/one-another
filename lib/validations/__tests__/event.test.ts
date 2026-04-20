import { createEventSchema, parseEventMetadata } from '@/lib/validations/event'

const validInput = {
  title: 'Sunday Worship',
  date: '2026-04-06',
  time: '09:00',
  location: 'Main Hall',
  host: 'Pastor John',
  tag: 'Youth Meeting',
  description: 'Weekly Sunday service',
}

describe('createEventSchema', () => {
  it('accepts a fully valid input', () => {
    expect(createEventSchema.safeParse(validInput).success).toBe(true)
  })

  it('accepts optional churchId and seriesId', () => {
    const result = createEventSchema.safeParse({ ...validInput, churchId: 'ch-1', seriesId: 'ser-1' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty title', () => {
    const result = createEventSchema.safeParse({ ...validInput, title: '' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.flatten().fieldErrors.title).toBeDefined()
  })

  it('rejects an empty date', () => {
    const result = createEventSchema.safeParse({ ...validInput, date: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a non-ISO date', () => {
    const result = createEventSchema.safeParse({ ...validInput, date: '06/04/2026' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty time', () => {
    const result = createEventSchema.safeParse({ ...validInput, time: '' })
    expect(result.success).toBe(false)
  })

  it('rejects a non-ISO time', () => {
    const result = createEventSchema.safeParse({ ...validInput, time: '9am' })
    expect(result.success).toBe(false)
  })

  it('accepts a valid datetimeISO', () => {
    const result = createEventSchema.safeParse({ ...validInput, datetimeISO: '2026-04-06T09:00:00.000Z' })
    expect(result.success).toBe(true)
  })

  it('rejects a malformed datetimeISO', () => {
    const result = createEventSchema.safeParse({ ...validInput, datetimeISO: 'not-a-datetime' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty location', () => {
    const result = createEventSchema.safeParse({ ...validInput, location: '' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty host', () => {
    const result = createEventSchema.safeParse({ ...validInput, host: '' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty tag', () => {
    const result = createEventSchema.safeParse({ ...validInput, tag: '' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty description', () => {
    const result = createEventSchema.safeParse({ ...validInput, description: '' })
    expect(result.success).toBe(false)
  })
})

describe('parseEventMetadata', () => {
  it('parses a well-formed metadata object', () => {
    const result = parseEventMetadata({
      registration: { capacity: 50, collectPhone: true, collectNotes: false },
    })
    expect(result).toEqual({
      registration: { capacity: 50, collectPhone: true, collectNotes: false },
    })
  })

  it('returns null capacity when capacity is null', () => {
    const result = parseEventMetadata({
      registration: { capacity: null, collectPhone: false, collectNotes: false },
    })
    expect(result.registration.capacity).toBeNull()
  })

  it('defaults all fields when raw is null', () => {
    const result = parseEventMetadata(null)
    expect(result).toEqual({
      registration: { capacity: null, collectPhone: false, collectNotes: false },
    })
  })

  it('defaults all fields when raw is undefined', () => {
    const result = parseEventMetadata(undefined)
    expect(result).toEqual({
      registration: { capacity: null, collectPhone: false, collectNotes: false },
    })
  })

  it('defaults all fields when raw is an empty object', () => {
    const result = parseEventMetadata({})
    expect(result).toEqual({
      registration: { capacity: null, collectPhone: false, collectNotes: false },
    })
  })

  it('defaults registration fields when registration key is missing', () => {
    const result = parseEventMetadata({ someOtherKey: true })
    expect(result).toEqual({
      registration: { capacity: null, collectPhone: false, collectNotes: false },
    })
  })

  it('defaults registration fields when registration is not an object', () => {
    const result = parseEventMetadata({ registration: 'invalid' })
    expect(result).toEqual({
      registration: { capacity: null, collectPhone: false, collectNotes: false },
    })
  })

  it('defaults registration fields when registration is an array', () => {
    const result = parseEventMetadata({ registration: [] })
    expect(result).toEqual({
      registration: { capacity: null, collectPhone: false, collectNotes: false },
    })
  })

  it('defaults capacity to null when it is a string', () => {
    const result = parseEventMetadata({
      registration: { capacity: '50', collectPhone: true, collectNotes: true },
    })
    expect(result.registration.capacity).toBeNull()
  })

  it('defaults collectPhone to false when it is not a boolean', () => {
    const result = parseEventMetadata({
      registration: { capacity: null, collectPhone: 1, collectNotes: false },
    })
    expect(result.registration.collectPhone).toBe(false)
  })

  it('defaults collectNotes to false when it is not a boolean', () => {
    const result = parseEventMetadata({
      registration: { capacity: null, collectPhone: false, collectNotes: 'yes' },
    })
    expect(result.registration.collectNotes).toBe(false)
  })

  it('defaults all fields when raw is a primitive', () => {
    const result = parseEventMetadata(42)
    expect(result).toEqual({
      registration: { capacity: null, collectPhone: false, collectNotes: false },
    })
  })
})
