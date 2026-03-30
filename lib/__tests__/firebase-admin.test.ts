jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(),
  getApp: jest.fn(),
  cert: jest.fn().mockReturnValue({}),
}))

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn().mockReturnValue({ sendEachForMulticast: jest.fn() }),
}))

import { initializeApp, getApps, getApp } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { getFirebaseAdmin } from '@/lib/firebase-admin'

const mockInitializeApp = initializeApp as jest.Mock
const mockGetApps = getApps as jest.Mock
const mockGetApp = getApp as jest.Mock
const mockGetMessaging = getMessaging as jest.Mock

beforeEach(() => jest.clearAllMocks())

describe('getFirebaseAdmin', () => {
  it('initializes the Firebase app when no apps exist', () => {
    const mockApp = { name: 'mock-app' }
    mockGetApps.mockReturnValue([])
    mockGetApp.mockReturnValue(mockApp)

    const result = getFirebaseAdmin()

    expect(mockInitializeApp).toHaveBeenCalledTimes(1)
    expect(mockGetMessaging).toHaveBeenCalledWith(mockApp)
    expect(result.messaging).toBeDefined()
  })

  it('reuses the existing app and does not re-initialize', () => {
    const mockApp = { name: 'existing-app' }
    mockGetApps.mockReturnValue([mockApp])
    mockGetApp.mockReturnValue(mockApp)

    getFirebaseAdmin()

    expect(mockInitializeApp).not.toHaveBeenCalled()
    expect(mockGetMessaging).toHaveBeenCalledWith(mockApp)
  })
})
