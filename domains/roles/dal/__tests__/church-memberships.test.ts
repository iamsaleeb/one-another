jest.mock('server-only', () => ({}))
jest.mock('@/lib/db', () => ({
  prisma: {
    churchMembership: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import {
  getChurchMembership,
  getChurchMembers,
  upsertChurchMembership,
  removeChurchMembership,
} from '../church-memberships'
import { prisma } from '@/lib/db'

const mockFindUnique = prisma.churchMembership.findUnique as jest.Mock
const mockFindMany = prisma.churchMembership.findMany as jest.Mock
const mockUpsert = prisma.churchMembership.upsert as jest.Mock
const mockDelete = prisma.churchMembership.delete as jest.Mock

describe('church-memberships DAL', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getChurchMembership', () => {
    it('queries by composite key', async () => {
      mockFindUnique.mockResolvedValue(null)
      await getChurchMembership('u1', 'c1')
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { userId_churchId: { userId: 'u1', churchId: 'c1' } },
      })
    })
    it('returns the membership record', async () => {
      const record = { userId: 'u1', churchId: 'c1', role: 'CHURCH_ADMIN' }
      mockFindUnique.mockResolvedValue(record)
      expect(await getChurchMembership('u1', 'c1')).toEqual(record)
    })
  })

  describe('getChurchMembers', () => {
    it('queries by churchId and includes user select', async () => {
      mockFindMany.mockResolvedValue([])
      await getChurchMembers('c1')
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { churchId: 'c1' },
        include: { user: { select: { id: true, name: true, email: true } } },
      })
    })
  })

  describe('upsertChurchMembership', () => {
    it('upserts with correct create and update data', async () => {
      mockUpsert.mockResolvedValue({})
      await upsertChurchMembership('u1', 'c1', 'EVENT_MANAGER', 'assigner-1')
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { userId_churchId: { userId: 'u1', churchId: 'c1' } },
        update: { role: 'EVENT_MANAGER', assignedBy: 'assigner-1' },
        create: { userId: 'u1', churchId: 'c1', role: 'EVENT_MANAGER', assignedBy: 'assigner-1' },
      })
    })
  })

  describe('removeChurchMembership', () => {
    it('deletes by composite key', async () => {
      mockDelete.mockResolvedValue({})
      await removeChurchMembership('u1', 'c1')
      expect(mockDelete).toHaveBeenCalledWith({
        where: { userId_churchId: { userId: 'u1', churchId: 'c1' } },
      })
    })
  })
})
