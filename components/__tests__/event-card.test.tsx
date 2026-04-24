import { render, screen } from '@testing-library/react'
import { EventCard } from '@/components/event-card'

const sampleEvent = {
  id: 'evt-1',
  datetime: new Date('2026-03-16T09:00'),
  title: 'Sunday Worship Service',
  churchName: 'Grace Church',
  host: 'Pastor John',
  tag: 'Youth Meeting',
  badge: 'Youth Meeting',
}

describe('EventCard', () => {
  it('renders the event title', () => {
    render(<EventCard event={sampleEvent} />)
    expect(screen.getByText('Sunday Worship Service')).toBeInTheDocument()
  })

  it('renders the event datetime', () => {
    render(<EventCard event={sampleEvent} />)
    expect(screen.getByText('MON, 16 MAR | 9:00 AM')).toBeInTheDocument()
  })

  it('renders the church name', () => {
    render(<EventCard event={sampleEvent} />)
    expect(screen.getByText('Grace Church')).toBeInTheDocument()
  })

  it('renders the event host', () => {
    render(<EventCard event={sampleEvent} />)
    expect(screen.getByText('Pastor John')).toBeInTheDocument()
  })

  it('renders the event tag badge', () => {
    render(<EventCard event={sampleEvent} />)
    expect(screen.getByText('Youth Meeting')).toBeInTheDocument()
  })

  it('wraps the card in a link to the event detail page', () => {
    render(<EventCard event={sampleEvent} />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/events/evt-1')
  })

  it('renders correctly with a different event id in the href', () => {
    const otherEvent = { ...sampleEvent, id: 'evt-99', title: 'Youth Night' }
    render(<EventCard event={otherEvent} />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '/events/evt-99')
    expect(screen.getByText('Youth Night')).toBeInTheDocument()
  })

  it('renders a cover photo when photoUrl is provided', () => {
    const eventWithPhoto = { ...sampleEvent, photoUrl: 'https://utfs.io/f/photo.jpg' }
    const { container } = render(<EventCard event={eventWithPhoto} />)
    expect(container.querySelector('img')).toBeInTheDocument()
  })

  it('does not render an img when photoUrl is not provided', () => {
    const { container } = render(<EventCard event={sampleEvent} />)
    expect(container.querySelector('img')).not.toBeInTheDocument()
  })

  it('shows a Cancelled badge instead of the tag when cancelledAt is set', () => {
    const cancelledEvent = { ...sampleEvent, cancelledAt: new Date() }
    render(<EventCard event={cancelledEvent} />)
    expect(screen.getByText('Cancelled')).toBeInTheDocument()
    expect(screen.queryByText('Youth Meeting')).not.toBeInTheDocument()
  })

  it('shows the tag badge when cancelledAt is null', () => {
    const activeEvent = { ...sampleEvent, cancelledAt: null }
    render(<EventCard event={activeEvent} />)
    expect(screen.getByText('Youth Meeting')).toBeInTheDocument()
    expect(screen.queryByText('Cancelled')).not.toBeInTheDocument()
  })
})
