import { render } from '@testing-library/react'
import { PushNotificationProvider } from '@/components/push-notification-provider'

const mockRemoveHandle = jest.fn()
const mockCheckPermissions = jest.fn()
const mockRequestPermissions = jest.fn()
const mockAddListener = jest.fn()
const mockRegister = jest.fn()
const mockRouterPush = jest.fn()

jest.mock('@capacitor-community/fcm', () => ({
  FCM: {
    getToken: jest.fn().mockResolvedValue({ token: 'fcm-token-123' }),
  },
}))

jest.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: jest.fn().mockReturnValue(false),
    getPlatform: jest.fn().mockReturnValue('android'),
  },
}))

jest.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    checkPermissions: (...args: unknown[]) => mockCheckPermissions(...args),
    requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
    addListener: (...args: unknown[]) => mockAddListener(...args),
    register: (...args: unknown[]) => mockRegister(...args),
  },
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

jest.mock('sonner', () => ({
  toast: jest.fn(),
}))

const { Capacitor } = jest.requireMock('@capacitor/core') as {
  Capacitor: { isNativePlatform: jest.Mock; getPlatform: jest.Mock }
}

beforeEach(() => {
  jest.clearAllMocks()
  Capacitor.isNativePlatform.mockReturnValue(false)
  // Each addListener call returns a handle with a remove() function
  mockAddListener.mockResolvedValue({ remove: mockRemoveHandle })
})

describe('PushNotificationProvider', () => {
  it('renders nothing (returns null)', () => {
    const { container } = render(<PushNotificationProvider />)

    expect(container.firstChild).toBeNull()
  })

  it('does not initialize push notifications when running on web', () => {
    Capacitor.isNativePlatform.mockReturnValue(false)

    render(<PushNotificationProvider />)

    expect(mockCheckPermissions).not.toHaveBeenCalled()
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('checks permissions when running on a native platform', async () => {
    Capacitor.isNativePlatform.mockReturnValue(true)
    mockCheckPermissions.mockResolvedValue({ receive: 'granted' })
    mockRegister.mockResolvedValue(undefined)

    render(<PushNotificationProvider />)

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockCheckPermissions).toHaveBeenCalled()
  })

  it('registers for push notifications when permissions are already granted', async () => {
    Capacitor.isNativePlatform.mockReturnValue(true)
    mockCheckPermissions.mockResolvedValue({ receive: 'granted' })
    mockRegister.mockResolvedValue(undefined)

    render(<PushNotificationProvider />)

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockRegister).toHaveBeenCalled()
    expect(mockRequestPermissions).not.toHaveBeenCalled()
  })

  it('registers all four listeners when permissions are granted', async () => {
    Capacitor.isNativePlatform.mockReturnValue(true)
    mockCheckPermissions.mockResolvedValue({ receive: 'granted' })
    mockRegister.mockResolvedValue(undefined)

    render(<PushNotificationProvider />)

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockAddListener).toHaveBeenCalledTimes(4)
    expect(mockAddListener).toHaveBeenCalledWith('registration', expect.any(Function))
    expect(mockAddListener).toHaveBeenCalledWith('registrationError', expect.any(Function))
    expect(mockAddListener).toHaveBeenCalledWith('pushNotificationReceived', expect.any(Function))
    expect(mockAddListener).toHaveBeenCalledWith('pushNotificationActionPerformed', expect.any(Function))
  })

  it('requests permissions when status is "prompt" before registering', async () => {
    Capacitor.isNativePlatform.mockReturnValue(true)
    mockCheckPermissions.mockResolvedValue({ receive: 'prompt' })
    mockRequestPermissions.mockResolvedValue({ receive: 'granted' })
    mockRegister.mockResolvedValue(undefined)

    render(<PushNotificationProvider />)

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockRequestPermissions).toHaveBeenCalled()
    expect(mockRegister).toHaveBeenCalled()
  })

  it('does not register when permissions are denied', async () => {
    Capacitor.isNativePlatform.mockReturnValue(true)
    mockCheckPermissions.mockResolvedValue({ receive: 'denied' })

    render(<PushNotificationProvider />)

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('does not register when permission request is denied after prompt', async () => {
    Capacitor.isNativePlatform.mockReturnValue(true)
    mockCheckPermissions.mockResolvedValue({ receive: 'prompt' })
    mockRequestPermissions.mockResolvedValue({ receive: 'denied' })

    render(<PushNotificationProvider />)

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('calls remove() on each individual listener handle on unmount', async () => {
    Capacitor.isNativePlatform.mockReturnValue(true)
    mockCheckPermissions.mockResolvedValue({ receive: 'granted' })
    mockRegister.mockResolvedValue(undefined)

    const { unmount } = render(<PushNotificationProvider />)

    await new Promise((resolve) => setTimeout(resolve, 0))
    unmount()

    // One remove() call per registered listener handle (4 listeners)
    expect(mockRemoveHandle).toHaveBeenCalledTimes(4)
  })

  it('uses token.value directly on Android (no FCM.getToken call)', async () => {
    const { FCM } = jest.requireMock('@capacitor-community/fcm') as { FCM: { getToken: jest.Mock } }
    Capacitor.isNativePlatform.mockReturnValue(true)
    Capacitor.getPlatform.mockReturnValue('android')
    mockCheckPermissions.mockResolvedValue({ receive: 'granted' })
    mockRegister.mockResolvedValue(undefined)
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response)

    render(<PushNotificationProvider />)
    await new Promise((resolve) => setTimeout(resolve, 0))

    const registrationCall = mockAddListener.mock.calls.find(([event]) => event === 'registration')
    const callback = registrationCall?.[1] as (t: { value: string }) => Promise<void>
    await callback({ value: 'android-fcm-token' })

    expect(FCM.getToken).not.toHaveBeenCalled()
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/push/register-token',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('android-fcm-token'),
      })
    )
  })

  it('calls FCM.getToken() on iOS to exchange APNs token for FCM token', async () => {
    const { FCM } = jest.requireMock('@capacitor-community/fcm') as { FCM: { getToken: jest.Mock } }
    Capacitor.isNativePlatform.mockReturnValue(true)
    Capacitor.getPlatform.mockReturnValue('ios')
    mockCheckPermissions.mockResolvedValue({ receive: 'granted' })
    mockRegister.mockResolvedValue(undefined)
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response)

    render(<PushNotificationProvider />)
    await new Promise((resolve) => setTimeout(resolve, 0))

    const registrationCall = mockAddListener.mock.calls.find(([event]) => event === 'registration')
    const callback = registrationCall?.[1] as (t: { value: string }) => Promise<void>
    await callback({ value: 'apns-device-token' })

    expect(FCM.getToken).toHaveBeenCalled()
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/push/register-token',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('fcm-token-123'),
      })
    )
  })

  it('shows a toast when a foreground notification is received', async () => {
    const { toast } = jest.requireMock('sonner') as { toast: jest.Mock }
    Capacitor.isNativePlatform.mockReturnValue(true)
    mockCheckPermissions.mockResolvedValue({ receive: 'granted' })
    mockRegister.mockResolvedValue(undefined)

    render(<PushNotificationProvider />)

    await new Promise((resolve) => setTimeout(resolve, 0))

    // Find and invoke the pushNotificationReceived callback
    const receivedCall = mockAddListener.mock.calls.find(
      ([event]) => event === 'pushNotificationReceived'
    )
    const callback = receivedCall?.[1] as (n: { title: string; body: string }) => void
    callback({ title: 'Event Reminder', body: 'Starts in 2 hours' })

    expect(toast).toHaveBeenCalledWith('Event Reminder', {
      description: 'Starts in 2 hours',
    })
  })
})
