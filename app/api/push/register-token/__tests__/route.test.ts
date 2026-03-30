/**
 * @jest-environment node
 */

jest.mock('@/auth', () => ({ auth: jest.fn() }))
jest.mock('@/lib/db', () => ({
  prisma: { pushToken: { upsert: jest.fn() } },
}))

import { NextRequest } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { POST } from '../route'

const mockAuth = auth as jest.Mock
const mockUpsert = prisma.pushToken.upsert as jest.Mock

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/push/register-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
  mockUpsert.mockResolvedValue({})
})

describe('POST /api/push/register-token', () => {
  it('returns 401 when there is no session', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await POST(makeRequest({ token: 'tok', platform: 'android' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 for malformed JSON', async () => {
    const req = new NextRequest('http://localhost/api/push/register-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not valid json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid JSON')
  })

  it('returns 400 when token is missing', async () => {
    const res = await POST(makeRequest({ platform: 'android' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when platform is invalid', async () => {
    const res = await POST(makeRequest({ token: 'tok', platform: 'web' }))
    expect(res.status).toBe(400)
  })

  it('upserts the token and returns 200 for a valid android request', async () => {
    const res = await POST(makeRequest({ token: 'tok-android', platform: 'android' }))
    expect(res.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'tok-android' },
        create: expect.objectContaining({ token: 'tok-android', platform: 'android', userId: 'user-1' }),
      })
    )
  })

  it('upserts the token and returns 200 for a valid ios request', async () => {
    const res = await POST(makeRequest({ token: 'tok-ios', platform: 'ios' }))
    expect(res.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { token: 'tok-ios' },
        create: expect.objectContaining({ token: 'tok-ios', platform: 'ios', userId: 'user-1' }),
      })
    )
  })
})
