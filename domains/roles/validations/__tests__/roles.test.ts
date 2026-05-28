import { AssignChurchRoleSchema, AssignEventRoleSchema, AssignPlatformRoleSchema } from '../roles'

describe('AssignChurchRoleSchema', () => {
  it('accepts valid input', () => {
    const result = AssignChurchRoleSchema.safeParse({
      userId: 'user-1',
      churchId: 'church-1',
      role: 'CHURCH_ADMIN',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid role', () => {
    const result = AssignChurchRoleSchema.safeParse({
      userId: 'user-1',
      churchId: 'church-1',
      role: 'INVALID_ROLE',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    const result = AssignChurchRoleSchema.safeParse({ userId: 'user-1' })
    expect(result.success).toBe(false)
  })
})

describe('AssignEventRoleSchema', () => {
  it('accepts valid input', () => {
    const result = AssignEventRoleSchema.safeParse({
      userId: 'user-1',
      eventId: 'event-1',
      role: 'EVENT_MANAGER',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid role', () => {
    const result = AssignEventRoleSchema.safeParse({
      userId: 'user-1',
      eventId: 'event-1',
      role: 'CHURCH_ADMIN',
    })
    expect(result.success).toBe(false)
  })
})

describe('AssignPlatformRoleSchema', () => {
  it('accepts PLATFORM_ADMIN', () => {
    const result = AssignPlatformRoleSchema.safeParse({
      userId: 'user-1',
      role: 'PLATFORM_ADMIN',
    })
    expect(result.success).toBe(true)
  })
})
