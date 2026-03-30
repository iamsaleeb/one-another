jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}))

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    notificationPreference: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

jest.mock('@/lib/schedule-notification', () => ({
  updateReminderScheduleForUser: jest.fn(),
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { updateReminderScheduleForUser } from '@/lib/schedule-notification'
import {
  getNotificationPreferencesAction,
  updateNotificationPreferenceAction,
} from '@/lib/actions/notifications'

const mockAuth = auth as jest.Mock
const mockPrefFindMany = prisma.notificationPreference.findMany as jest.Mock
const mockPrefUpsert = prisma.notificationPreference.upsert as jest.Mock
const mockUpdateReminderSchedule = updateReminderScheduleForUser as jest.Mock
const mockRevalidatePath = revalidatePath as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
})

describe('getNotificationPreferencesAction', () => {
  it('returns defaults for all types when no preferences are stored', async () => {
    mockPrefFindMany.mockResolvedValue([])

    const prefs = await getNotificationPreferencesAction()

    expect(prefs.EVENT_REMINDER.enabled).toBe(true)
    expect(prefs.EVENT_REMINDER.config?.hoursBeforeEvent).toBe(2)
    expect(prefs.NEW_SERIES_SESSION.enabled).toBe(true)
    expect(prefs.NEW_SERIES_SESSION.config).toBeUndefined()
    expect(prefs.EVENT_CANCELLED.enabled).toBe(true)
    expect(prefs.EVENT_POSTPONED.enabled).toBe(true)
  })

  it('merges stored preferences over defaults', async () => {
    mockPrefFindMany.mockResolvedValue([
      { type: 'EVENT_REMINDER', enabled: false, config: { hoursBeforeEvent: 4 } },
      { type: 'NEW_SERIES_SESSION', enabled: false, config: null },
    ])

    const prefs = await getNotificationPreferencesAction()

    expect(prefs.EVENT_REMINDER.enabled).toBe(false)
    expect(prefs.EVENT_REMINDER.config?.hoursBeforeEvent).toBe(4)
    expect(prefs.NEW_SERIES_SESSION.enabled).toBe(false)
    // Unstored types still default to enabled
    expect(prefs.EVENT_CANCELLED.enabled).toBe(true)
  })

  it('falls back to default hoursBeforeEvent when stored config is missing the field', async () => {
    mockPrefFindMany.mockResolvedValue([
      { type: 'EVENT_REMINDER', enabled: true, config: {} },
    ])

    const prefs = await getNotificationPreferencesAction()

    expect(prefs.EVENT_REMINDER.config?.hoursBeforeEvent).toBe(2)
  })

  it('throws Unauthorized when there is no session', async () => {
    mockAuth.mockResolvedValue(null)

    await expect(getNotificationPreferencesAction()).rejects.toThrow('Unauthorized')
  })
})

describe('updateNotificationPreferenceAction', () => {
  it('upserts a preference and revalidates the notifications path', async () => {
    mockPrefUpsert.mockResolvedValue({})

    const result = await updateNotificationPreferenceAction('EVENT_CANCELLED', false)

    expect(result).toEqual({})
    expect(mockPrefUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_type: { userId: 'user-1', type: 'EVENT_CANCELLED' } },
        update: { enabled: false, config: undefined },
        create: expect.objectContaining({ userId: 'user-1', type: 'EVENT_CANCELLED', enabled: false }),
      })
    )
    expect(mockRevalidatePath).toHaveBeenCalledWith('/profile/notifications')
  })

  it('calls updateReminderScheduleForUser when EVENT_REMINDER hoursBeforeEvent changes', async () => {
    mockPrefUpsert.mockResolvedValue({})
    mockUpdateReminderSchedule.mockResolvedValue(undefined)

    await updateNotificationPreferenceAction('EVENT_REMINDER', true, { hoursBeforeEvent: 4 })

    expect(mockUpdateReminderSchedule).toHaveBeenCalledWith('user-1', 4)
  })

  it('does not call updateReminderScheduleForUser for non-EVENT_REMINDER types', async () => {
    mockPrefUpsert.mockResolvedValue({})

    await updateNotificationPreferenceAction('EVENT_CANCELLED', false)

    expect(mockUpdateReminderSchedule).not.toHaveBeenCalled()
  })

  it('does not call updateReminderScheduleForUser when config has no hoursBeforeEvent', async () => {
    mockPrefUpsert.mockResolvedValue({})

    await updateNotificationPreferenceAction('EVENT_REMINDER', false)

    expect(mockUpdateReminderSchedule).not.toHaveBeenCalled()
  })

  it('returns an error when there is no session', async () => {
    mockAuth.mockResolvedValue(null)

    const result = await updateNotificationPreferenceAction('EVENT_CANCELLED', false)

    expect(result.error).toBe('Unauthorized')
    expect(mockPrefUpsert).not.toHaveBeenCalled()
  })

  it('returns an error for an invalid notification type', async () => {
    const result = await updateNotificationPreferenceAction(
      'INVALID_TYPE' as never,
      true
    )

    expect(result.error).toBe('Invalid notification type')
    expect(mockPrefUpsert).not.toHaveBeenCalled()
  })

  it('passes config to upsert when provided', async () => {
    mockPrefUpsert.mockResolvedValue({})

    await updateNotificationPreferenceAction('EVENT_REMINDER', true, { hoursBeforeEvent: 1 })

    expect(mockPrefUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { enabled: true, config: { hoursBeforeEvent: 1 } },
      })
    )
  })
})
