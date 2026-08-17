import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { NetworkBadge } from './NetworkBadge'

afterEach(cleanup)

describe('NetworkBadge', () => {
  it('renders the network name when present', () => {
    const { getByText } = render(<NetworkBadge network="CBS" />)
    expect(getByText('CBS')).toBeTruthy()
  })

  it('renders nothing when network is null', () => {
    const { container } = render(<NetworkBadge network={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('applies the purple pill styling', () => {
    const { getByText } = render(<NetworkBadge network="Prime" />)
    const badge = getByText('Prime')
    expect(badge.className).toContain('bg-purple-100')
    expect(badge.className).toContain('text-purple-700')
    expect(badge.className).toContain('rounded-pill')
  })
})
