import { createEventSchema } from '@/lib/validations/event'

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

  it('rejects an empty time', () => {
    const result = createEventSchema.safeParse({ ...validInput, time: '' })
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
