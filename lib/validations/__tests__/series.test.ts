import { createSeriesSchema } from '@/lib/validations/series'

const validInput = {
  name: 'Weekly Bible Study',
  description: 'A weekly deep dive into scripture',
  cadence: 'WEEKLY' as const,
  location: 'Room 101',
  host: 'Pastor John',
  tag: 'Bible Study',
  churchId: 'ch-1',
}

describe('createSeriesSchema', () => {
  it('accepts a fully valid input', () => {
    expect(createSeriesSchema.safeParse(validInput).success).toBe(true)
  })

  it('accepts all valid cadence values', () => {
    for (const cadence of ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM'] as const) {
      expect(createSeriesSchema.safeParse({ ...validInput, cadence }).success).toBe(true)
    }
  })

  it('requires a churchId', () => {
    const { churchId: _, ...withoutChurch } = validInput
    const result = createSeriesSchema.safeParse(withoutChurch)
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.flatten().fieldErrors.churchId).toBeDefined()
  })

  it('rejects an empty churchId', () => {
    const result = createSeriesSchema.safeParse({ ...validInput, churchId: '' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.flatten().fieldErrors.churchId).toBeDefined()
  })

  it('rejects an empty name', () => {
    const result = createSeriesSchema.safeParse({ ...validInput, name: '' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.flatten().fieldErrors.name).toBeDefined()
  })

  it('rejects an empty description', () => {
    const result = createSeriesSchema.safeParse({ ...validInput, description: '' })
    expect(result.success).toBe(false)
  })

  it('rejects an invalid cadence', () => {
    const result = createSeriesSchema.safeParse({ ...validInput, cadence: 'DAILY' })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.flatten().fieldErrors.cadence).toBeDefined()
  })

  it('rejects an empty location', () => {
    const result = createSeriesSchema.safeParse({ ...validInput, location: '' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty host', () => {
    const result = createSeriesSchema.safeParse({ ...validInput, host: '' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty tag', () => {
    const result = createSeriesSchema.safeParse({ ...validInput, tag: '' })
    expect(result.success).toBe(false)
  })
})
