import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { DayGroupHeader } from './DayGroupHeader'

afterEach(cleanup)

describe('DayGroupHeader', () => {
  it('shows the label and a live countdown when unlocked', () => {
    const lockAt = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
    const { getByText, queryByText } = render(
      <DayGroupHeader label="SUNDAY" lockAt={lockAt} isLocked={false} onExpired={() => {}} />
    )
    expect(getByText('SUNDAY')).toBeTruthy()
    expect(getByText(/Locks in/)).toBeTruthy()
    expect(queryByText('Locked')).toBeNull()
  })

  it('shows a locked label instead of a countdown when locked', () => {
    const lockAt = new Date(Date.now() - 1000).toISOString()
    const { getByText, queryByText } = render(
      <DayGroupHeader label="THURSDAY" lockAt={lockAt} isLocked={true} onExpired={() => {}} />
    )
    expect(getByText('THURSDAY')).toBeTruthy()
    expect(getByText(/Locked/)).toBeTruthy()
    expect(queryByText(/Locks in/)).toBeNull()
  })
})
