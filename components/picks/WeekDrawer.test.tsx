import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { WeekDrawer, type WeekSummary } from './WeekDrawer'

afterEach(cleanup)

const noop = () => {}

function makeWeeks(): WeekSummary[] {
  return [
    { id: 'w1', week_number: 1, season_year: 2026, lock_time: '2026-01-01T00:00:00Z', picks: { total: 4, wins: 4, losses: 1, pushes: 0 } },
    { id: 'w2', week_number: 2, season_year: 2026, lock_time: '2099-01-01T00:00:00Z', picks: { total: 2, wins: 0, losses: 0, pushes: 0 } },
    { id: 'w3', week_number: 3, season_year: 2026, lock_time: '2099-01-01T00:00:00Z', picks: { total: 0, wins: 0, losses: 0, pushes: 0 } },
  ]
}

describe('WeekDrawer', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <WeekDrawer weeks={makeWeeks()} currentWeekId="w2" currentWeekSubmittedCount={2} isOpen={false} onClose={noop} onSelectWeek={noop} />
    )
    expect(container.firstChild).toBeNull()
  })

  it("shows a graded week's W-L record", () => {
    const { getByText } = render(
      <WeekDrawer weeks={makeWeeks()} currentWeekId="w2" currentWeekSubmittedCount={2} isOpen={true} onClose={noop} onSelectWeek={noop} />
    )
    expect(getByText('4-1')).toBeTruthy()
  })

  it("shows the live currentWeekSubmittedCount for the current week, not the stale picks.total", () => {
    const { getByText, queryByText } = render(
      <WeekDrawer weeks={makeWeeks()} currentWeekId="w2" currentWeekSubmittedCount={5} isOpen={true} onClose={noop} onSelectWeek={noop} />
    )
    expect(getByText('5/5')).toBeTruthy()
    expect(queryByText('2/5')).toBeNull()
  })

  it('shows "—" for a future week with no picks', () => {
    const { getAllByText } = render(
      <WeekDrawer weeks={makeWeeks()} currentWeekId="w2" currentWeekSubmittedCount={2} isOpen={true} onClose={noop} onSelectWeek={noop} />
    )
    expect(getAllByText('—')).toHaveLength(1)
  })

  it('calls onSelectWeek and onClose when a week button is tapped', () => {
    let selected: string | null = null
    let closed = false
    const { getByText } = render(
      <WeekDrawer weeks={makeWeeks()} currentWeekId="w2" currentWeekSubmittedCount={2} isOpen={true} onClose={() => { closed = true }} onSelectWeek={id => { selected = id }} />
    )
    getByText('1').closest('button')!.click()
    expect(selected).toBe('w1')
    expect(closed).toBe(true)
  })

  it('closes on Escape', () => {
    let closed = false
    render(
      <WeekDrawer weeks={makeWeeks()} currentWeekId="w2" currentWeekSubmittedCount={2} isOpen={true} onClose={() => { closed = true }} onSelectWeek={noop} />
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(closed).toBe(true)
  })

  it('has dialog semantics', () => {
    const { getByRole } = render(
      <WeekDrawer weeks={makeWeeks()} currentWeekId="w2" currentWeekSubmittedCount={2} isOpen={true} onClose={noop} onSelectWeek={noop} />
    )
    const dialog = getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy()
  })

  it('moves focus into the dialog on open', () => {
    render(
      <WeekDrawer weeks={makeWeeks()} currentWeekId="w2" currentWeekSubmittedCount={2} isOpen={true} onClose={noop} onSelectWeek={noop} />
    )
    expect(document.activeElement?.getAttribute('role')).toBe('dialog')
  })

  it('traps Tab within the dialog, wrapping from the last button to the first', () => {
    const { getAllByRole } = render(
      <WeekDrawer weeks={makeWeeks()} currentWeekId="w2" currentWeekSubmittedCount={2} isOpen={true} onClose={noop} onSelectWeek={noop} />
    )
    const buttons = getAllByRole('button')
    buttons[buttons.length - 1].focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(buttons[0])
  })

  it('traps Shift+Tab within the dialog, wrapping from the first button to the last', () => {
    const { getAllByRole } = render(
      <WeekDrawer weeks={makeWeeks()} currentWeekId="w2" currentWeekSubmittedCount={2} isOpen={true} onClose={noop} onSelectWeek={noop} />
    )
    const buttons = getAllByRole('button')
    buttons[0].focus()
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(buttons[buttons.length - 1])
  })

  it('returns focus to the previously-focused element on close', () => {
    const { rerender } = render(
      <div>
        <button data-testid="trigger">Open</button>
        <WeekDrawer weeks={makeWeeks()} currentWeekId="w2" currentWeekSubmittedCount={2} isOpen={false} onClose={noop} onSelectWeek={noop} />
      </div>
    )
    const trigger = document.querySelector('[data-testid="trigger"]') as HTMLElement
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    rerender(
      <div>
        <button data-testid="trigger">Open</button>
        <WeekDrawer weeks={makeWeeks()} currentWeekId="w2" currentWeekSubmittedCount={2} isOpen={true} onClose={noop} onSelectWeek={noop} />
      </div>
    )
    expect(document.activeElement?.getAttribute('role')).toBe('dialog')

    rerender(
      <div>
        <button data-testid="trigger">Open</button>
        <WeekDrawer weeks={makeWeeks()} currentWeekId="w2" currentWeekSubmittedCount={2} isOpen={false} onClose={noop} onSelectWeek={noop} />
      </div>
    )
    expect(document.activeElement).toBe(trigger)
  })
})
