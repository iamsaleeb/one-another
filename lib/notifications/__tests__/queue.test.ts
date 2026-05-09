import { NotificationType } from '@prisma/client'

describe('NotificationType enum', () => {
  it('is exported from @prisma/client with all expected values', () => {
    expect(Object.values(NotificationType)).toContain('EVENT_REMINDER')
    expect(Object.values(NotificationType)).toContain('NEW_SERIES_SESSION')
    expect(Object.values(NotificationType)).toContain('EVENT_CANCELLED')
  })
})
