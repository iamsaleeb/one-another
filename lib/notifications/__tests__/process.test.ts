import { NotificationType } from '@prisma/client'

// Mock prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    notification: {
      findMany: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({}),
    },
    notificationPreference: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    pushToken: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({}),
    },
  },
}))

// Mock firebase-admin
const mockSendEachForMulticast = jest.fn()
jest.mock('@/lib/firebase-admin', () => ({
  getFirebaseAdmin: () => ({
    messaging: {
      sendEachForMulticast: mockSendEachForMulticast,
    },
  }),
}))

import { prisma } from '@/lib/db'
import { processNotifications } from '../process'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

const makeNotif = (id: string, userId = 'user-1') => ({
  id,
  userId,
  type: NotificationType.EVENT_REMINDER,
  title: `Notif ${id}`,
  body: `Body ${id}`,
  data: null,
  scheduledFor: new Date(),
  sentAt: null,
  cancelledAt: null,
  dedupeKey: null,
  createdAt: new Date(),
})

describe('processNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Restore default mock implementations after clearAllMocks
    ;(mockPrisma.notificationPreference.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.pushToken.findMany as jest.Mock).mockResolvedValue([])
    ;(mockPrisma.notification.updateMany as jest.Mock).mockResolvedValue({})
    ;(mockPrisma.pushToken.deleteMany as jest.Mock).mockResolvedValue({})
    mockSendEachForMulticast.mockResolvedValue({
      responses: [{ success: true }],
      successCount: 1,
      failureCount: 0,
    })
  })

  it('returns processed: 0 when no due notifications', async () => {
    ;(mockPrisma.notification.findMany as jest.Mock).mockResolvedValue([])

    const result = await processNotifications()
    expect(result).toEqual({ processed: 0 })
    expect(mockSendEachForMulticast).not.toHaveBeenCalled()
  })

  it('marks notification as sent when no push tokens', async () => {
    ;(mockPrisma.notification.findMany as jest.Mock).mockResolvedValue([makeNotif('notif-1')])
    ;(mockPrisma.pushToken.findMany as jest.Mock).mockResolvedValue([])

    const result = await processNotifications()
    expect(result).toEqual({ processed: 1 })
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['notif-1'] } } })
    )
  })

  it('marks notification as sent when user opted out', async () => {
    ;(mockPrisma.notification.findMany as jest.Mock).mockResolvedValue([makeNotif('notif-1')])
    ;(mockPrisma.notificationPreference.findMany as jest.Mock).mockResolvedValue([
      { userId: 'user-1', type: NotificationType.EVENT_REMINDER },
    ])
    ;(mockPrisma.pushToken.findMany as jest.Mock).mockResolvedValue([{ userId: 'user-1', token: 'tok-a' }])

    const result = await processNotifications()
    expect(result).toEqual({ processed: 1 })
    expect(mockSendEachForMulticast).not.toHaveBeenCalled()
  })

  it('sends FCM and marks notification sent when tokens exist', async () => {
    ;(mockPrisma.notification.findMany as jest.Mock).mockResolvedValue([makeNotif('notif-1')])
    ;(mockPrisma.pushToken.findMany as jest.Mock).mockResolvedValue([{ userId: 'user-1', token: 'tok-a' }])

    const result = await processNotifications()
    expect(result).toEqual({ processed: 1 })
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(1)
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['notif-1'] } } })
    )
  })

  it('deletes stale tokens on invalid-registration-token error', async () => {
    ;(mockPrisma.notification.findMany as jest.Mock).mockResolvedValue([makeNotif('notif-1')])
    ;(mockPrisma.pushToken.findMany as jest.Mock).mockResolvedValue([{ userId: 'user-1', token: 'bad-tok' }])
    mockSendEachForMulticast.mockResolvedValue({
      responses: [{ success: false, error: { code: 'messaging/invalid-registration-token' } }],
      successCount: 0,
      failureCount: 1,
    })

    await processNotifications()
    expect(mockPrisma.pushToken.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { token: { in: ['bad-tok'] } } })
    )
  })

  it('processes all due notifications in concurrent batches', async () => {
    const notifications = [makeNotif('notif-1'), makeNotif('notif-2'), makeNotif('notif-3')]
    ;(mockPrisma.notification.findMany as jest.Mock).mockResolvedValue(notifications)
    ;(mockPrisma.pushToken.findMany as jest.Mock).mockResolvedValue([{ userId: 'user-1', token: 'tok-a' }])

    const result = await processNotifications()

    // All 3 notifications should be processed (sent via FCM)
    expect(result).toEqual({ processed: 3 })
    // sendEachForMulticast called once per notification (each user has 1 token batch)
    expect(mockSendEachForMulticast).toHaveBeenCalledTimes(3)
    // updateMany called with all 3 ids
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: expect.arrayContaining(['notif-1', 'notif-2', 'notif-3']) } },
      })
    )
  })
})
