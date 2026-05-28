jest.mock('server-only', () => ({}))
jest.mock('next/navigation', () => ({
  forbidden: jest.fn(() => { throw new Error('FORBIDDEN') }),
  unauthorized: jest.fn(() => { throw new Error('UNAUTHORIZED') }),
}))

import { requireCapability } from '../require-capability'
import { forbidden, unauthorized } from 'next/navigation'
import { Capabilities } from '../capabilities'
import type { RoleClaims } from '../types'

describe('requireCapability', () => {
  beforeEach(() => jest.clearAllMocks())

  it('calls unauthorized() and throws when claims is null', () => {
    expect(() =>
      requireCapability(null, Capabilities.CHURCH_MANAGE, { scope: 'CHURCH', churchId: 'c1' })
    ).toThrow('UNAUTHORIZED')
    expect(unauthorized).toHaveBeenCalledTimes(1)
  })

  it('calls forbidden() and throws when claims lack the capability', () => {
    const claims: RoleClaims = { isPlatformAdmin: false, churchMemberships: [] }
    expect(() =>
      requireCapability(claims, Capabilities.CHURCH_MANAGE, { scope: 'CHURCH', churchId: 'c1' })
    ).toThrow('FORBIDDEN')
    expect(forbidden).toHaveBeenCalledTimes(1)
  })

  it('does not throw when platform admin', () => {
    const claims: RoleClaims = { isPlatformAdmin: true, churchMemberships: [] }
    expect(() =>
      requireCapability(claims, Capabilities.CHURCH_MANAGE, { scope: 'CHURCH', churchId: 'c1' })
    ).not.toThrow()
  })

  it('does not throw when claims grant the capability', () => {
    const claims: RoleClaims = {
      isPlatformAdmin: false,
      churchMemberships: [{ churchId: 'c1', role: 'CHURCH_ADMIN' }],
    }
    expect(() =>
      requireCapability(claims, Capabilities.CHURCH_MANAGE, { scope: 'CHURCH', churchId: 'c1' })
    ).not.toThrow()
  })
})
