import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { GameCard, type Game } from './GameCard'

afterEach(cleanup)

const baseGame: Game = {
  id: 'game-1',
  home_team: 'SEA',
  away_team: 'NE',
  home_team_full: 'Seahawks',
  away_team_full: 'Patriots',
  spread: -3.5,
  kickoff_time: '2026-09-09T00:15:00Z',
  status: 'scheduled',
  final_home_score: null,
  final_away_score: null,
}

const noop = () => {}

function renderCard() {
  return render(
    <GameCard
      game={baseGame}
      pick={null}
      isLocked={false}
      atPickLimit={false}
      onPick={noop}
      onDeselect={noop}
    />
  )
}

describe('GameCard team logos', () => {
  it('renders a logo image per side pointing at the ESPN CDN, in away-then-home order', () => {
    const { container } = renderCard()
    const imgs = container.querySelectorAll('img')
    expect(imgs).toHaveLength(2)
    expect(imgs[0].src).toBe('https://a.espncdn.com/i/teamlogos/nfl/500/ne.png')
    expect(imgs[0].alt).toBe('')
    expect(imgs[1].src).toBe('https://a.espncdn.com/i/teamlogos/nfl/500/sea.png')
    expect(imgs[1].alt).toBe('')
  })

  it('hides a logo image if it fails to load', () => {
    const { container } = renderCard()
    const img = container.querySelectorAll('img')[0]
    expect(img.style.display).not.toBe('none')
    img.dispatchEvent(new Event('error'))
    expect(img.style.display).toBe('none')
  })

  it('no longer renders the full team name text', () => {
    const { queryByText } = renderCard()
    expect(queryByText('Patriots')).toBeNull()
    expect(queryByText('Seahawks')).toBeNull()
  })

  it('still renders the team codes and spread labels', () => {
    const { getAllByText } = renderCard()
    expect(getAllByText('NE')).toHaveLength(1)
    expect(getAllByText('SEA')).toHaveLength(1)
    expect(getAllByText('+3.5')).toHaveLength(1)
    expect(getAllByText('-3.5')).toHaveLength(1)
  })
})
