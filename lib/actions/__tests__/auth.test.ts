// Mocks must be declared before imports (jest.mock is hoisted)
jest.mock('@/auth', () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
}))

jest.mock('next-auth', () => {
  class AuthError extends Error {
    type: string
    constructor(type: string, options?: unknown) {
      super(type)
      this.type = type
      this.name = 'AuthError'
      void options
    }
  }
  return { AuthError }
})

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}))

jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

import { loginAction, registerAction, signOutAction } from '@/lib/actions/auth'
import { signIn, signOut } from '@/auth'
import { AuthError } from 'next-auth'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

const mockSignIn = signIn as jest.Mock
const mockSignOut = signOut as jest.Mock
const mockBcryptHash = bcrypt.hash as jest.Mock
const mockFindUnique = prisma.user.findUnique as jest.Mock
const mockCreate = prisma.user.create as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
})

// ──────────────────────────────────────────────────────────────────────────────
// loginAction
// ──────────────────────────────────────────────────────────────────────────────
describe('loginAction', () => {
  it('returns fieldErrors when email is invalid', async () => {
    const result = await loginAction({ email: 'bad-email', password: 'pass' })
    expect(result.fieldErrors?.email).toBeDefined()
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('returns fieldErrors when password is empty', async () => {
    const result = await loginAction({ email: 'user@example.com', password: '' })
    expect(result.fieldErrors?.password).toBeDefined()
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('calls signIn with valid credentials and returns empty object on success', async () => {
    mockSignIn.mockResolvedValue(undefined)
    const result = await loginAction({ email: 'user@example.com', password: 'hunter2' })
    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'user@example.com',
      password: 'hunter2',
      redirectTo: '/',
    })
    expect(result).toEqual({})
  })

  it('returns "Invalid email or password" for CredentialsSignin AuthError', async () => {
    const err = new AuthError('CredentialsSignin')
    mockSignIn.mockRejectedValue(err)
    const result = await loginAction({ email: 'user@example.com', password: 'wrong' })
    expect(result.error).toBe('Invalid email or password.')
  })

  it('returns generic error message for other AuthError types', async () => {
    const err = new AuthError('OAuthSignInError')
    mockSignIn.mockRejectedValue(err)
    const result = await loginAction({ email: 'user@example.com', password: 'pass123' })
    expect(result.error).toBe('Something went wrong. Please try again.')
  })

  it('re-throws non-AuthError exceptions', async () => {
    const unexpected = new Error('DB down')
    mockSignIn.mockRejectedValue(unexpected)
    await expect(loginAction({ email: 'user@example.com', password: 'pass123' })).rejects.toThrow('DB down')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// registerAction
// ──────────────────────────────────────────────────────────────────────────────
describe('registerAction', () => {
  const validData = {
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'securepass',
    confirmPassword: 'securepass',
  }

  it('returns fieldErrors for invalid registration data', async () => {
    const result = await registerAction({ ...validData, name: 'J' })
    expect(result.fieldErrors?.name).toBeDefined()
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('returns email fieldError when user already exists', async () => {
    mockFindUnique.mockResolvedValue({ id: 'existing-id', email: 'jane@example.com' })
    const result = await registerAction(validData)
    expect(result.fieldErrors?.email).toContain(
      'An account with this email already exists.'
    )
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('creates user and calls signIn on success', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockBcryptHash.mockResolvedValue('hashed-password')
    mockCreate.mockResolvedValue({ id: 'new-id' })
    mockSignIn.mockResolvedValue(undefined)

    const result = await registerAction(validData)

    expect(mockBcryptHash).toHaveBeenCalledWith('securepass', 12)
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'hashed-password',
      },
    })
    expect(mockSignIn).toHaveBeenCalledWith('credentials', {
      email: 'jane@example.com',
      password: 'securepass',
      redirectTo: '/',
    })
    expect(result).toEqual({})
  })

  it('returns account-created-but-signin-failed message on post-create AuthError', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockBcryptHash.mockResolvedValue('hashed-password')
    mockCreate.mockResolvedValue({ id: 'new-id' })
    mockSignIn.mockRejectedValue(new AuthError('CredentialsSignin'))

    const result = await registerAction(validData)

    expect(result.error).toBe('Account created but sign-in failed. Please log in.')
  })

  it('re-throws non-AuthError exceptions after user creation', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockBcryptHash.mockResolvedValue('hashed')
    mockCreate.mockResolvedValue({ id: 'new-id' })
    mockSignIn.mockRejectedValue(new Error('Network failure'))

    await expect(registerAction(validData)).rejects.toThrow('Network failure')
  })
})

// ──────────────────────────────────────────────────────────────────────────────
// signOutAction
// ──────────────────────────────────────────────────────────────────────────────
describe('signOutAction', () => {
  it('calls signOut with redirect to /login', async () => {
    mockSignOut.mockResolvedValue(undefined)
    await signOutAction()
    expect(mockSignOut).toHaveBeenCalledWith({ redirectTo: '/login' })
  })
})
