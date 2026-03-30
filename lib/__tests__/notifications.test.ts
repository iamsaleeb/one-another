jest.mock('@/lib/db', () => ({
  prisma: {
    notificationPreference: {
      findMany: jest.fn(),
    },
    pushToken: {
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdmin: jest.fn(),
}))

import { prisma } from '@/lib/db'
import { getFirebaseAdmin } from '@/lib/firebase-admin'
import { sendPushToUsers } from '@/lib/notifications'

const mockPrefFindMany = prisma.notificationPreference.findMany as jest.Mock
const mockTokenFindMany = prisma.pushToken.findMany as jest.Mock
const mockTokenDeleteMany = prisma.pushToken.deleteMany as jest.Mock
const mockGetFirebaseAdmin = getFirebaseAdmin as jest.Mock
const mockSendEachForMulticast = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockPrefFindMany.mockResolvedValue([])
  mockGetFirebaseAdmin.mockReturnValue({
    messaging: { sendEachForMulticast: mockSendEachForMulticast },
  })
})

describe('sendPushToUsers', () => {
  it('returns immediately for an empty userIds array', async () => {
    await sendPushToUsers([], 'EVENT_REMINDER', 'title', 'body')

    expect(mockPrefFindMany).not.toHaveBeenCalled()
  })

  it('returns when all users have opted out of the notification type', async () => {
    mockPrefFindMany.mockResolvedValue([{ userId: 'user-1' }])

    await sendPushToUsers(['user-1'], 'EVENT_REMINDER', 'title', 'body')

    expect(mockTokenFindMany).not.toHaveBeenCalled()
  })

  it('returns when no push tokens exist for target users', async () => {
    mockTokenFindMany.mockResolvedValue([])

    await sendPushToUsers(['user-1'], 'EVENT_REMINDER', 'title', 'body')

    expect(mockSendEachForMulticast).not.toHaveBeenCalled()
  })

  it('sends a multicast message to all tokens', async () => {
    mockTokenFindMany.mockResolvedValue([{ token: 'tok-1' }, { token: 'tok-2' }])
    mockSendEachForMulticast.mockResolvedValue({
      responses: [{ success: true }, { success: true }],
    })

    await sendPushToUsers(['user-1'], 'EVENT_REMINDER', 'Test Title', 'Test Body', { key: 'val' })

    expect(mockSendEachForMulticast).toHaveBeenCalledWith({
      tokens: ['tok-1', 'tok-2'],
      notification: { title: 'Test Title', body: 'Test Body' },
      data: { key: 'val' },
    })
  })

  it('uses an empty data object when no extra data is provided', async () => {
    mockTokenFindMany.mockResolvedValue([{ token: 'tok-1' }])
    mockSendEachForMulticast.mockResolvedValue({ responses: [{ success: true }] })

    await sendPushToUsers(['user-1'], 'EVENT_REMINDER', 'title', 'body')

    expect(mockSendEachForMulticast).toHaveBeenCalledWith(
      expect.objectContaining({ data: {} })
    )
  })

  it('deletes stale tokens when FCM returns registration-not-registered error', async () => {
    mockTokenFindMany.mockResolvedValue([{ token: 'tok-ok' }, { token: 'tok-stale' }])
    mockSendEachForMulticast.mockResolvedValue({
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
      ],
    })
    mockTokenDeleteMany.mockResolvedValue({})

    await sendPushToUsers(['user-1'], 'EVENT_REMINDER', 'title', 'body')

    expect(mockTokenDeleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['tok-stale'] } },
    })
  })

  it('deletes stale tokens for invalid-registration-token error', async () => {
    mockTokenFindMany.mockResolvedValue([{ token: 'tok-invalid' }])
    mockSendEachForMulticast.mockResolvedValue({
      responses: [
        { success: false, error: { code: 'messaging/invalid-registration-token' } },
      ],
    })
    mockTokenDeleteMany.mockResolvedValue({})

    await sendPushToUsers(['user-1'], 'EVENT_REMINDER', 'title', 'body')

    expect(mockTokenDeleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['tok-invalid'] } },
    })
  })

  it('does not call deleteMany when there are no stale tokens', async () => {
    mockTokenFindMany.mockResolvedValue([{ token: 'tok-1' }])
    mockSendEachForMulticast.mockResolvedValue({
      responses: [{ success: false, error: { code: 'messaging/internal-error' } }],
    })

    await sendPushToUsers(['user-1'], 'EVENT_REMINDER', 'title', 'body')

    expect(mockTokenDeleteMany).not.toHaveBeenCalled()
  })

  it('only sends to users who have not opted out (partial opt-out)', async () => {
    // user-2 has opted out, user-1 has not
    mockPrefFindMany.mockResolvedValue([{ userId: 'user-2' }])
    mockTokenFindMany.mockResolvedValue([{ token: 'tok-user-1' }])
    mockSendEachForMulticast.mockResolvedValue({ responses: [{ success: true }] })

    await sendPushToUsers(['user-1', 'user-2'], 'EVENT_REMINDER', 'title', 'body')

    // Only user-1's tokens should be fetched
    expect(mockTokenFindMany).toHaveBeenCalledWith({
      where: { userId: { in: ['user-1'] } },
      select: { token: true },
    })
  })
})
