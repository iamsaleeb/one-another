// types/next-auth.d.ts
import 'next-auth'
import 'next-auth/jwt'
import type { ChurchRole } from '@prisma/client'
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      isPlatformAdmin: boolean
      churchMemberships: { churchId: string; role: ChurchRole }[]
      onboardingCompleted: boolean
      isEmailVerified: boolean
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    isPlatformAdmin?: boolean
    churchMemberships?: { churchId: string; role: ChurchRole }[]
    onboardingCompleted?: boolean
    isEmailVerified?: boolean
  }
}
