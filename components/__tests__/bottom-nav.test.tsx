import { render, screen } from '@testing-library/react'
import { BottomNav } from '@/components/bottom-nav'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

import { usePathname } from 'next/navigation'

const mockUsePathname = usePathname as jest.Mock

describe('BottomNav', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/')
  })

  it('renders all three navigation tabs', () => {
    render(<BottomNav />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Churches')).toBeInTheDocument()
    expect(screen.getByText('My Events')).toBeInTheDocument()
  })

  it('renders nav links with correct hrefs', () => {
    render(<BottomNav />)
    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))
    expect(hrefs).toContain('/')
    expect(hrefs).toContain('/churches')
    expect(hrefs).toContain('/my-events')
  })

  it('renders on the churches listing page', () => {
    mockUsePathname.mockReturnValue('/churches')
    render(<BottomNav />)
    expect(screen.getByText('Churches')).toBeInTheDocument()
  })

  it('renders on the my-events page', () => {
    mockUsePathname.mockReturnValue('/my-events')
    render(<BottomNav />)
    expect(screen.getByText('My Events')).toBeInTheDocument()
  })

  it('renders four tabs including Tools when isOrganiser is true', () => {
    render(<BottomNav isOrganiser={true} />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Churches')).toBeInTheDocument()
    expect(screen.getByText('My Events')).toBeInTheDocument()
    expect(screen.getByText('Tools')).toBeInTheDocument()
  })

  it('Tools tab links to /organiser', () => {
    render(<BottomNav isOrganiser={true} />)
    const links = screen.getAllByRole('link')
    const organiserLink = links.find((l) => l.getAttribute('href') === '/organiser')
    expect(organiserLink).toBeDefined()
  })

  it('does not render Tools tab when isOrganiser is false', () => {
    render(<BottomNav isOrganiser={false} />)
    expect(screen.queryByText('Tools')).not.toBeInTheDocument()
  })

  it('renders five tabs including Tools and Admin when isAdmin is true', () => {
    render(<BottomNav isAdmin={true} />)
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Churches')).toBeInTheDocument()
    expect(screen.getByText('My Events')).toBeInTheDocument()
    expect(screen.getByText('Tools')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('Admin tab links to /admin', () => {
    render(<BottomNav isAdmin={true} />)
    const links = screen.getAllByRole('link')
    const adminLink = links.find((l) => l.getAttribute('href') === '/admin')
    expect(adminLink).toBeDefined()
  })

  it('does not render Admin tab when isAdmin is false', () => {
    render(<BottomNav isAdmin={false} />)
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('shows both Tools and Admin tabs when isAdmin is true', () => {
    render(<BottomNav isAdmin={true} isOrganiser={true} />)
    expect(screen.getByText('Admin')).toBeInTheDocument()
    expect(screen.getByText('Tools')).toBeInTheDocument()
  })
})
