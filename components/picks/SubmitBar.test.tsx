import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { SubmitBar, type SubmitSlot } from './SubmitBar'
import type { Game } from './GameCard'

afterEach(cleanup)

const baseGame: Game = {
  id: 'game-1',
  home_team: 'SEA',
  away_team: 'NE',
  home_team_full: 'Seahawks',
  away_team_full: 'Patriots',
  spread: -3.5,
  kickoff_time: '2026-09-09T00:15:00Z',
  broadcast_network: null,
  status: 'scheduled',
  final_home_score: null,
  final_away_score: null,
}

const noop = () => {}

describe('SubmitBar', () => {
  it('renders 5 empty dashed dots when nothing is staged', () => {
    const { container } = render(<SubmitBar slots={[]} isDirty={false} isSubmitting={false} onSubmit={noop} />)
    expect(container.querySelectorAll('span.border-dashed')).toHaveLength(5)
  })

  it('shows a disabled grey Submit button when nothing is staged', () => {
    const { getByText } = render(<SubmitBar slots={[]} isDirty={false} isSubmitting={false} onSubmit={noop} />)
    const button = getByText('Submit').closest('button')!
    expect(button.disabled).toBe(true)
    expect(button.className).toContain('bg-gray-4')
  })

  it('shows an active purple Submit button when dirty', () => {
    const slots: SubmitSlot[] = [{ game: baseGame, team: 'NE', isSynced: false }]
    const { getByText } = render(<SubmitBar slots={slots} isDirty={true} isSubmitting={false} onSubmit={noop} />)
    const button = getByText('Submit').closest('button')!
    expect(button.disabled).toBe(false)
    expect(button.className).toContain('bg-purple-700')
  })

  it('calls onSubmit when the active Submit button is tapped', () => {
    let submitCount = 0
    const slots: SubmitSlot[] = [{ game: baseGame, team: 'NE', isSynced: false }]
    const { getByText } = render(<SubmitBar slots={slots} isDirty={true} isSubmitting={false} onSubmit={() => { submitCount++ }} />)
    getByText('Submit').closest('button')!.click()
    expect(submitCount).toBe(1)
  })

  it('shows a disabled light-green "Submitted" pill when fully in sync', () => {
    const slots: SubmitSlot[] = [{ game: baseGame, team: 'NE', isSynced: true }]
    const { getByText } = render(<SubmitBar slots={slots} isDirty={false} isSubmitting={false} onSubmit={noop} />)
    const button = getByText('Submitted').closest('button')!
    expect(button.disabled).toBe(true)
    expect(button.className).toContain('bg-green-light')
  })

  it('disables the button and shows "Submitting…" while isSubmitting', () => {
    const slots: SubmitSlot[] = [{ game: baseGame, team: 'NE', isSynced: false }]
    const { getByText } = render(<SubmitBar slots={slots} isDirty={true} isSubmitting={true} onSubmit={noop} />)
    expect(getByText('Submitting…').closest('button')!.disabled).toBe(true)
  })

  it('renders a filled dot with the spread badge for a staged pick', () => {
    const slots: SubmitSlot[] = [{ game: baseGame, team: 'NE', isSynced: false }]
    const { getByText, container } = render(<SubmitBar slots={slots} isDirty={true} isSubmitting={false} onSubmit={noop} />)
    expect(getByText('+3.5')).toBeTruthy()
    expect(container.querySelector('img')!.src).toBe('https://a.espncdn.com/i/teamlogos/nfl/500/ne.png')
  })

  it('colors a synced dot green', () => {
    const slots: SubmitSlot[] = [{ game: baseGame, team: 'NE', isSynced: true }]
    const { container } = render(<SubmitBar slots={slots} isDirty={false} isSubmitting={false} onSubmit={noop} />)
    expect(container.querySelector('span.border-green')).toBeTruthy()
  })

  it('colors an unsynced dot purple', () => {
    const slots: SubmitSlot[] = [{ game: baseGame, team: 'NE', isSynced: false }]
    const { container } = render(<SubmitBar slots={slots} isDirty={true} isSubmitting={false} onSubmit={noop} />)
    expect(container.querySelector('span.border-purple-700')).toBeTruthy()
  })
})
