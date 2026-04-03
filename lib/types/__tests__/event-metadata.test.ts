import { parseEventMetadata } from '@/lib/types/event-metadata'

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
