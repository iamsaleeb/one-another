import { render, screen } from '@testing-library/react'
import { BottomNav } from '@/components/bottom-nav'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useParams: jest.fn(),
}))

import { usePathname, useParams } from 'next/navigation'

const mockUsePathname = usePathname as jest.Mock
const mockUseParams = useParams as jest.Mock

describe('BottomNav', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/')
    mockUseParams.mockReturnValue({})
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

  it('returns null on an event detail page', () => {
    mockUsePathname.mockReturnValue('/events/evt-123')
    mockUseParams.mockReturnValue({ id: 'evt-123' })
    const { container } = render(<BottomNav />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null on a church detail page', () => {
    mockUsePathname.mockReturnValue('/churches/ch-456')
    mockUseParams.mockReturnValue({ id: 'ch-456' })
    const { container } = render(<BottomNav />)
    expect(container.firstChild).toBeNull()
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
})
