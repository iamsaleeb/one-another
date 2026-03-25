import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  useParams: jest.fn(),
}))

import {
  usePathname,
  useRouter,
  useSearchParams,
  useParams,
} from 'next/navigation'
import { TopNav } from '@/components/top-nav'

const mockPush = jest.fn()
const mockBack = jest.fn()

function setupNavMocks({
  pathname = '/',
  q = '',
  params = {},
}: {
  pathname?: string
  q?: string
  params?: Record<string, string>
} = {}) {
  ;(usePathname as jest.Mock).mockReturnValue(pathname)
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: mockBack })
  ;(useSearchParams as jest.Mock).mockReturnValue({
    get: (key: string) => (key === 'q' ? q || null : null),
  })
  ;(useParams as jest.Mock).mockReturnValue(params)
}

beforeEach(() => {
  jest.clearAllMocks()
  setupNavMocks()
})

describe('TopNav — home page', () => {
  it('renders the app brand link', () => {
    render(<TopNav />)
    expect(screen.getByText('1Another')).toBeInTheDocument()
  })

  it('renders the search input', () => {
    render(<TopNav />)
    expect(
      screen.getByPlaceholderText(/search events/i)
    ).toBeInTheDocument()
  })

  it('renders a link to the profile page', () => {
    render(<TopNav />)
    const links = screen.getAllByRole('link')
    const profileLink = links.find((l) => l.getAttribute('href') === '/profile')
    expect(profileLink).toBeInTheDocument()
  })

  it('pre-fills search input from URL query param', () => {
    setupNavMocks({ q: 'worship' })
    render(<TopNav />)
    expect(screen.getByDisplayValue('worship')).toBeInTheDocument()
  })

  it('shows a clear (X) button when search input has a value', () => {
    setupNavMocks({ q: 'hello' })
    render(<TopNav />)
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()
  })

  it('navigates on search form submit', async () => {
    render(<TopNav />)
    const input = screen.getByPlaceholderText(/search events/i)
    await userEvent.type(input, 'grace')
    const submitBtn = screen.getByRole('button', { name: /^search$/i })
    await userEvent.click(submitBtn)
    expect(mockPush).toHaveBeenCalledWith('/?q=grace')
  })

  it('navigates to / on empty search submit', async () => {
    render(<TopNav />)
    const submitBtn = screen.getByRole('button', { name: /^search$/i })
    await userEvent.click(submitBtn)
    expect(mockPush).toHaveBeenCalledWith('/')
  })
})

describe('TopNav — event detail page', () => {
  it('shows back button instead of brand link', () => {
    setupNavMocks({ pathname: '/events/evt-1', params: { id: 'evt-1' } })
    render(<TopNav />)
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
    expect(screen.queryByText('1Another')).not.toBeInTheDocument()
  })

  it('hides the search bar on detail pages', () => {
    setupNavMocks({ pathname: '/events/evt-1', params: { id: 'evt-1' } })
    render(<TopNav />)
    expect(
      screen.queryByPlaceholderText(/search events/i)
    ).not.toBeInTheDocument()
  })

  it('calls router.back() when the back button is clicked on an event detail', async () => {
    setupNavMocks({ pathname: '/events/evt-1', params: { id: 'evt-1' } })
    render(<TopNav />)
    await userEvent.click(screen.getByRole('button', { name: /go back/i }))
    expect(mockBack).toHaveBeenCalled()
  })
})

describe('TopNav — church detail page', () => {
  it('shows back button on church detail page', () => {
    setupNavMocks({ pathname: '/churches/ch-1', params: { id: 'ch-1' } })
    render(<TopNav />)
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })

  it('calls router.back() when back button is clicked on church detail', async () => {
    setupNavMocks({ pathname: '/churches/ch-1', params: { id: 'ch-1' } })
    render(<TopNav />)
    await userEvent.click(screen.getByRole('button', { name: /go back/i }))
    expect(mockBack).toHaveBeenCalled()
  })
})

describe('TopNav — user avatar initials (getInitials)', () => {
  it('shows two initials from a full name', () => {
    render(<TopNav user={{ name: 'Jane Doe' }} />)
    expect(screen.getByText('JD')).toBeInTheDocument()
  })

  it('shows first two characters for a single-word name', () => {
    render(<TopNav user={{ name: 'Jane' }} />)
    expect(screen.getByText('JA')).toBeInTheDocument()
  })

  it('falls back to email initial when name is absent', () => {
    render(<TopNav user={{ email: 'test@example.com' }} />)
    expect(screen.getByText('T')).toBeInTheDocument()
  })

  it('shows "?" when no user info is available', () => {
    render(<TopNav />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })
})
