import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotificationSettings } from '@/components/notification-settings'
import type { NotificationPreferenceMap } from '@/lib/actions/notifications'

const mockUpdatePreference = jest.fn().mockResolvedValue({})

jest.mock('@/lib/actions/notifications', () => ({
  updateNotificationPreferenceAction: (...args: unknown[]) => mockUpdatePreference(...args),
}))

const enabledPreferences: NotificationPreferenceMap = {
  EVENT_REMINDER: { enabled: true, config: { hoursBeforeEvent: 2 } },
  NEW_SERIES_SESSION: { enabled: true, config: undefined },
  EVENT_CANCELLED: { enabled: true, config: undefined },
}

beforeEach(() => jest.clearAllMocks())

describe('NotificationSettings', () => {
  it('renders a row for each notification type', () => {
    render(<NotificationSettings preferences={enabledPreferences} />)

    expect(screen.getByText('Event Reminders')).toBeInTheDocument()
    expect(screen.getByText('New Series Sessions')).toBeInTheDocument()
    expect(screen.getByText('Event Cancellations')).toBeInTheDocument()
  })

  it('renders a switch for each notification type', () => {
    render(<NotificationSettings preferences={enabledPreferences} />)

    expect(screen.getAllByRole('switch')).toHaveLength(3)
  })

  it('renders the timing select when EVENT_REMINDER is enabled', () => {
    render(<NotificationSettings preferences={enabledPreferences} />)

    expect(screen.getByText('How far in advance')).toBeInTheDocument()
  })

  it('hides the timing select when EVENT_REMINDER is disabled', () => {
    const disabledReminder: NotificationPreferenceMap = {
      ...enabledPreferences,
      EVENT_REMINDER: { enabled: false, config: { hoursBeforeEvent: 2 } },
    }
    render(<NotificationSettings preferences={disabledReminder} />)

    expect(screen.queryByText('How far in advance')).not.toBeInTheDocument()
  })

  it('calls updateNotificationPreferenceAction when a switch is toggled', async () => {
    const user = userEvent.setup()
    render(<NotificationSettings preferences={enabledPreferences} />)

    const switches = screen.getAllByRole('switch')
    await user.click(switches[1]) // NEW_SERIES_SESSION switch

    expect(mockUpdatePreference).toHaveBeenCalled()
  })

  it('calls updateNotificationPreferenceAction with the new hoursBeforeEvent when timing select changes', async () => {
    const user = userEvent.setup()
    render(<NotificationSettings preferences={enabledPreferences} />)

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, '4')

    expect(mockUpdatePreference).toHaveBeenCalledWith(
      'EVENT_REMINDER',
      true,
      expect.objectContaining({ hoursBeforeEvent: 4 })
    )
  })

  it('renders descriptions for each notification type', () => {
    render(<NotificationSettings preferences={enabledPreferences} />)

    expect(
      screen.getByText("Get notified before events you're attending start")
    ).toBeInTheDocument()
    expect(
      screen.getByText('Get notified when a new session is added to a series you follow')
    ).toBeInTheDocument()
  })
})
