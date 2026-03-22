import { render, screen, fireEvent } from '@testing-library/react'
import { CreateEventFAB } from '@/components/create-event-fab'

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
  useParams: jest.fn(),
}))

jest.mock('@/lib/hooks/use-is-detail-page', () => ({
  useIsDetailPage: jest.fn(),
}))

import { useIsDetailPage } from '@/lib/hooks/use-is-detail-page'

const mockUseIsDetailPage = useIsDetailPage as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockUseIsDetailPage.mockReturnValue(false)
})

describe('CreateEventFAB', () => {
  it('renders nothing when isOrganiser is false', () => {
    const { container } = render(<CreateEventFAB isOrganiser={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing on a detail page even for organisers', () => {
    mockUseIsDetailPage.mockReturnValue(true)
    const { container } = render(<CreateEventFAB isOrganiser={true} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the FAB button for organisers on non-detail pages', () => {
    render(<CreateEventFAB isOrganiser={true} />)
    expect(screen.getByRole('button', { name: /create new/i })).toBeInTheDocument()
  })

  it('shows the menu links when the FAB button is clicked', () => {
    render(<CreateEventFAB isOrganiser={true} />)
    fireEvent.click(screen.getByRole('button', { name: /create new/i }))
    expect(screen.getByText('New Series')).toBeInTheDocument()
    expect(screen.getByText('New Event')).toBeInTheDocument()
  })

  it('hides the menu links when the FAB is clicked again', () => {
    render(<CreateEventFAB isOrganiser={true} />)
    const btn = screen.getByRole('button', { name: /create new/i })
    fireEvent.click(btn)
    fireEvent.click(screen.getByRole('button', { name: /close menu/i }))
    expect(screen.queryByText('New Series')).not.toBeInTheDocument()
  })

  it('New Series link points to /series/create', () => {
    render(<CreateEventFAB isOrganiser={true} />)
    fireEvent.click(screen.getByRole('button', { name: /create new/i }))
    expect(screen.getByText('New Series').closest('a')).toHaveAttribute('href', '/series/create')
  })

  it('New Event link points to /events/create', () => {
    render(<CreateEventFAB isOrganiser={true} />)
    fireEvent.click(screen.getByRole('button', { name: /create new/i }))
    expect(screen.getByText('New Event').closest('a')).toHaveAttribute('href', '/events/create')
  })
})
