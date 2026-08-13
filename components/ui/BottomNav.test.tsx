import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { BottomNav } from './BottomNav'

const mockUsePathname = vi.fn()
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('BottomNav', () => {
  it('renders all three labels', () => {
    mockUsePathname.mockReturnValue('/picks')
    const { getByText } = render(<BottomNav />)
    expect(getByText('Picks')).toBeTruthy()
    expect(getByText('Standings')).toBeTruthy()
    expect(getByText('Account')).toBeTruthy()
  })

  it('renders Picks as a real link to /picks, and nothing else as a link', () => {
    mockUsePathname.mockReturnValue('/picks')
    const { container } = render(<BottomNav />)
    const links = container.querySelectorAll('a')
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('/picks')
  })

  it('marks Standings and Account as disabled', () => {
    mockUsePathname.mockReturnValue('/picks')
    const { getByText } = render(<BottomNav />)
    expect(getByText('Standings').closest('[aria-disabled="true"]')).toBeTruthy()
    expect(getByText('Account').closest('[aria-disabled="true"]')).toBeTruthy()
  })

  it('does not mark Picks as disabled', () => {
    mockUsePathname.mockReturnValue('/picks')
    const { getByText } = render(<BottomNav />)
    expect(getByText('Picks').closest('[aria-disabled="true"]')).toBeNull()
  })
})
