import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

import { useRouter } from 'next/navigation'
import { SearchBar } from '@/components/search-bar'

const mockPush = jest.fn()

function setup(props: React.ComponentProps<typeof SearchBar> = {}) {
  ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  return render(<SearchBar {...props} />)
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ─── Initial render ────────────────────────────────────────────────────────────

describe('SearchBar — initial render', () => {
  it('renders the search input', () => {
    setup()
    expect(screen.getByPlaceholderText(/search events & churches/i)).toBeInTheDocument()
  })

  it('renders the search submit button', () => {
    setup()
    expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument()
  })

  it('pre-fills query from initialQuery prop', () => {
    setup({ initialQuery: 'grace' })
    expect(screen.getByDisplayValue('grace')).toBeInTheDocument()
  })

  it('does not show dropdown before interaction', () => {
    setup()
    expect(screen.queryByText('When')).not.toBeInTheDocument()
  })

  it('does not show clear button when no query or filters', () => {
    setup()
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument()
  })

  it('shows clear button when initialQuery is provided', () => {
    setup({ initialQuery: 'worship' })
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()
  })

  it('shows clear button when an initial filter is active', () => {
    setup({ initialWhen: 'today' })
    expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()
  })
})

// ─── Active filter pills ────────────────────────────────────────────────────────

describe('SearchBar — active filter pills', () => {
  it('shows a when pill for initialWhen', () => {
    setup({ initialWhen: 'today' })
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  it('shows a category pill for initialCategory', () => {
    setup({ initialCategory: 'Worship' })
    expect(screen.getByText('Worship')).toBeInTheDocument()
  })

  it('shows a type pill for initialType when not "all"', () => {
    setup({ initialType: 'events' })
    expect(screen.getByText('Events only')).toBeInTheDocument()
  })

  it('does not show a type pill when initialType is "all"', () => {
    setup({ initialType: 'all' })
    expect(screen.queryByText('All')).not.toBeInTheDocument()
  })

  it('removes the when pill and navigates on its X button click', async () => {
    setup({ initialWhen: 'tomorrow' })
    await userEvent.click(screen.getByRole('button', { name: /remove tomorrow filter/i }))
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('removes the category pill and navigates on its X button click', async () => {
    setup({ initialCategory: 'Outreach' })
    await userEvent.click(screen.getByRole('button', { name: /remove outreach filter/i }))
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('removes the type pill and navigates on its X button click', async () => {
    setup({ initialType: 'churches' })
    await userEvent.click(screen.getByRole('button', { name: /remove churches only filter/i }))
    expect(mockPush).toHaveBeenCalledWith('/')
  })
})

// ─── Dropdown ──────────────────────────────────────────────────────────────────

describe('SearchBar — dropdown', () => {
  it('opens when the input is focused', async () => {
    setup()
    await userEvent.click(screen.getByPlaceholderText(/search events/i))
    expect(screen.getByText('When')).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Type')).toBeInTheDocument()
  })

  it('shows all when options in dropdown', async () => {
    setup()
    await userEvent.click(screen.getByPlaceholderText(/search events/i))
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tomorrow' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'This Weekend' })).toBeInTheDocument()
  })

  it('shows all category options in dropdown', async () => {
    setup()
    await userEvent.click(screen.getByPlaceholderText(/search events/i))
    expect(screen.getByRole('button', { name: 'Youth Meeting' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bible Study' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Servants Meeting' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Camp' })).toBeInTheDocument()
  })

  it('closes on Escape key', async () => {
    setup()
    await userEvent.click(screen.getByPlaceholderText(/search events/i))
    expect(screen.getByText('When')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByText('When')).not.toBeInTheDocument()
  })

  it('closes when the backdrop is clicked', async () => {
    setup()
    await userEvent.click(screen.getByPlaceholderText(/search events/i))
    expect(screen.getByText('When')).toBeInTheDocument()
    fireEvent.click(screen.getByTestId('search-backdrop'))
    expect(screen.queryByText('When')).not.toBeInTheDocument()
  })

  it('closes on submit', async () => {
    setup()
    await userEvent.click(screen.getByPlaceholderText(/search events/i))
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }))
    expect(screen.queryByText('When')).not.toBeInTheDocument()
  })
})

// ─── Search submission ─────────────────────────────────────────────────────────

describe('SearchBar — search submission', () => {
  it('navigates with query on submit', async () => {
    setup()
    await userEvent.type(screen.getByPlaceholderText(/search events/i), 'worship')
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }))
    expect(mockPush).toHaveBeenCalledWith('/?q=worship')
  })

  it('navigates to / on empty submit', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }))
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('trims whitespace from query before navigating', async () => {
    setup()
    await userEvent.type(screen.getByPlaceholderText(/search events/i), '  grace  ')
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }))
    expect(mockPush).toHaveBeenCalledWith('/?q=grace')
  })
})

// ─── Clear ─────────────────────────────────────────────────────────────────────

describe('SearchBar — clear', () => {
  it('resets all state and navigates to / on clear', async () => {
    setup({ initialQuery: 'grace', initialWhen: 'today', initialCategory: 'Worship' })
    await userEvent.click(screen.getByRole('button', { name: /clear search/i }))
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('hides the clear button after clearing', async () => {
    setup({ initialQuery: 'grace' })
    await userEvent.click(screen.getByRole('button', { name: /clear search/i }))
    expect(screen.queryByRole('button', { name: /clear search/i })).not.toBeInTheDocument()
  })
})

// ─── When filter ───────────────────────────────────────────────────────────────

describe('SearchBar — when filter', () => {
  it('selects "today" and navigates', async () => {
    setup()
    await userEvent.click(screen.getByPlaceholderText(/search events/i))
    await userEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(mockPush).toHaveBeenCalledWith('/?when=today')
  })

  it('selects "tomorrow" and navigates', async () => {
    setup()
    await userEvent.click(screen.getByPlaceholderText(/search events/i))
    await userEvent.click(screen.getByRole('button', { name: 'Tomorrow' }))
    expect(mockPush).toHaveBeenCalledWith('/?when=tomorrow')
  })

  it('selects "weekend" and navigates', async () => {
    setup()
    await userEvent.click(screen.getByPlaceholderText(/search events/i))
    await userEvent.click(screen.getByRole('button', { name: 'This Weekend' }))
    expect(mockPush).toHaveBeenCalledWith('/?when=weekend')
  })

  it('deselects the active when filter when clicking it again', async () => {
    setup({ initialWhen: 'today' })
    await userEvent.click(screen.getByPlaceholderText(/search events/i))
    // FilterChip button (distinct from ActivePill span)
    await userEvent.click(screen.getByRole('button', { name: 'Today' }))
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('shows active styling on the selected when chip', async () => {
    setup({ initialWhen: 'tomorrow' })
    await userEvent.click(screen.getByPlaceholderText(/search events/i))
    const chip = screen.getByRole('button', { name: 'Tomorrow' })
    expect(chip.className).toMatch(/bg-primary/)
  })
})

// ─── Category filter ───────────────────────────────────────────────────────────

describe('SearchBar — category filter', () => {
  it('selects a category and navigates', async () => {
    setup()
    await userEvent.click(screen.getByPlaceholderText(/search events/i))
    await userEvent.click(screen.getByRole('button', { name: 'Youth Meeting' }))
    expect(mockPush).toHaveBeenCalledWith('/?category=Youth+Meeting')
  })

  it('deselects the active category when clicking it again', async () => {
    setup({ initialCategory: 'Servants Meeting' })
    await userEvent.click(screen.getByPlaceholderText(/search events/i))
    await userEvent.click(screen.getByRole('button', { name: 'Servants Meeting' }))
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('shows active styling on the selected category chip', async () => {
    setup({ initialCategory: 'Youth Meeting' })
    await userEvent.click(screen.getByPlaceholderText(/search events/i))
    const chip = screen.getByRole('button', { name: 'Youth Meeting' })
    expect(chip.className).toMatch(/bg-blue-100/)
  })
})

// ─── Combined filters ──────────────────────────────────────────────────────────

describe('SearchBar — combined filters', () => {
  it('builds URL with query + when + category', async () => {
    setup({ initialQuery: 'grace', initialWhen: 'today', initialCategory: 'Camp' })
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }))
    expect(mockPush).toHaveBeenCalledWith('/?q=grace&category=Camp&when=today')
  })

  it('builds URL with query + type', async () => {
    setup({ initialQuery: 'grace', initialType: 'events' })
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }))
    expect(mockPush).toHaveBeenCalledWith('/?q=grace&type=events')
  })

  it('omits type=all from URL', async () => {
    setup({ initialQuery: 'test', initialType: 'all' })
    await userEvent.click(screen.getByRole('button', { name: /^search$/i }))
    expect(mockPush).toHaveBeenCalledWith('/?q=test')
  })
})
