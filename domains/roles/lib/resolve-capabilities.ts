import 'server-only'
import { prisma } from '@/lib/db'
import { CHURCH_ROLE_CAPABILITIES, EVENT_ROLE_CAPABILITIES } from './roles'
import { Capabilities } from './capabilities'
import type { Capability } from './capabilities'
import type { ScopeContext } from './types'

export async function resolveCapabilities(
  userId: string,
  context: ScopeContext
): Promise<Set<Capability>> {
  const caps = new Set<Capability>()

  const platformRole = await prisma.platformRoleAssignment.findFirst({
    where: { userId },
  })
  if (platformRole) {
    return new Set(Object.values(Capabilities) as Capability[])
  }

  if (context.scope === 'CHURCH') {
    const membership = await prisma.churchMembership.findUnique({
      where: { userId_churchId: { userId, churchId: context.churchId } },
    })
    if (membership) {
      ;(CHURCH_ROLE_CAPABILITIES[membership.role] as string[]).forEach((c) =>
        caps.add(c as Capability)
      )
    }
    return caps
  }

  if (context.scope === 'EVENT') {
    const [membership, staffAssignment] = await Promise.all([
      prisma.churchMembership.findUnique({
        where: { userId_churchId: { userId, churchId: context.churchId } },
      }),
      prisma.eventStaffAssignment.findUnique({
        where: { userId_eventId: { userId, eventId: context.eventId } },
      }),
    ])
    if (membership) {
      ;(CHURCH_ROLE_CAPABILITIES[membership.role] as string[]).forEach((c) =>
        caps.add(c as Capability)
      )
    }
    if (staffAssignment) {
      ;(EVENT_ROLE_CAPABILITIES[staffAssignment.role] as string[]).forEach((c) =>
        caps.add(c as Capability)
      )
    }
    return caps
  }

  return caps
}
