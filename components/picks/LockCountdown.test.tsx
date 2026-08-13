import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { LockCountdown } from './LockCountdown'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('LockCountdown', () => {
  it('renders neutral color with more than 24h remaining', () => {
    const lockTime = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()
    const { container } = render(<LockCountdown lockTime={lockTime} />)
    const span = container.querySelector('span')!
    expect(span.className).toContain('text-gray-9')
  })

  it('renders amber under 24h remaining', () => {
    const lockTime = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
    const { container } = render(<LockCountdown lockTime={lockTime} />)
    const span = container.querySelector('span')!
    expect(span.className).toContain('text-gold')
  })

  it('renders red under 2h remaining', () => {
    const lockTime = new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString()
    const { container } = render(<LockCountdown lockTime={lockTime} />)
    const span = container.querySelector('span')!
    expect(span.className).toContain('text-red')
  })

  it('renders "Locked" in neutral color once lockTime has already passed', () => {
    const lockTime = new Date(Date.now() - 1000).toISOString()
    const { getByText, container } = render(<LockCountdown lockTime={lockTime} />)
    expect(getByText('Locked')).toBeTruthy()
    const span = container.querySelector('span')!
    expect(span.className).toContain('text-gray-9')
  })

  it('calls onExpired once the countdown reaches zero', () => {
    vi.useFakeTimers()
    const lockTime = new Date(Date.now() + 1500).toISOString()
    let expired = false
    render(<LockCountdown lockTime={lockTime} onExpired={() => { expired = true }} />)
    expect(expired).toBe(false)
    vi.advanceTimersByTime(2000)
    expect(expired).toBe(true)
  })
})
