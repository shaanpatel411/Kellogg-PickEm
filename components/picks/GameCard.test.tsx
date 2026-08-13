import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { GameCard, type Game, type Pick } from './GameCard'

afterEach(cleanup)

const baseGame: Game = {
  id: 'game-1',
  home_team: 'SEA',
  away_team: 'NE',
  home_team_full: 'Seahawks',
  away_team_full: 'Patriots',
  spread: -3.5,
  kickoff_time: '2026-09-09T00:15:00Z',
  kickoff_slot: null,
  broadcast_network: null,
  status: 'scheduled',
  final_home_score: null,
  final_away_score: null,
}

const noop = () => {}

function renderCard(overrides: { onBlockedTap?: () => void; isActiveWeek?: boolean } = {}) {
  return render(
    <GameCard
      game={baseGame}
      pick={null}
      isLocked={false}
      atPickLimit={false}
      isActiveWeek={overrides.isActiveWeek ?? true}
      onPick={noop}
      onDeselect={noop}
      onBlockedTap={overrides.onBlockedTap ?? noop}
      onLockedTap={noop}
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

  it('calls onBlockedTap instead of onPick when tapping a side with no spread yet', () => {
    let blockedTapCount = 0
    const noSpreadGame: Game = { ...baseGame, spread: null }
    const { container } = render(
      <GameCard
        game={noSpreadGame}
        pick={null}
        isLocked={false}
        atPickLimit={false}
        isActiveWeek={true}
        onPick={() => { throw new Error('onPick should not be called') }}
        onDeselect={noop}
        onBlockedTap={() => { blockedTapCount++ }}
        onLockedTap={noop}
      />
    )
    const [awaySide] = container.querySelectorAll('div[class*="flex-1"]')
    awaySide.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(blockedTapCount).toBe(1)
  })

  it('shows Spread TBD and blocks the tap for a non-active week even when real spread data exists', () => {
    let blockedTapCount = 0
    const { container, getByText, queryByText } = render(
      <GameCard
        game={baseGame}
        pick={null}
        isLocked={false}
        atPickLimit={false}
        isActiveWeek={false}
        onPick={() => { throw new Error('onPick should not be called') }}
        onDeselect={noop}
        onBlockedTap={() => { blockedTapCount++ }}
        onLockedTap={noop}
      />
    )
    expect(getByText('Spread TBD')).toBeTruthy()
    expect(queryByText('+3.5')).toBeNull()
    expect(queryByText('-3.5')).toBeNull()

    const [awaySide] = container.querySelectorAll('div[class*="flex-1"]')
    awaySide.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(blockedTapCount).toBe(1)
  })

  it('still shows the real spread for a past, non-active (locked) week', () => {
    const { getAllByText, queryByText } = render(
      <GameCard
        game={baseGame}
        pick={null}
        isLocked={true}
        atPickLimit={false}
        isActiveWeek={false}
        onPick={noop}
        onDeselect={noop}
        onBlockedTap={noop}
        onLockedTap={noop}
      />
    )
    expect(getAllByText('+3.5')).toHaveLength(1)
    expect(getAllByText('-3.5')).toHaveLength(1)
    expect(queryByText('Spread TBD')).toBeNull()
  })
})

describe('GameCard schedule info', () => {
  it('shows TNF for a Thursday night game', () => {
    const game: Game = { ...baseGame, kickoff_slot: 'thu_night' }
    const { getByText } = render(
      <GameCard game={game} pick={null} isLocked={false} atPickLimit={false} isActiveWeek={true} onPick={noop} onDeselect={noop} onBlockedTap={noop} onLockedTap={noop} />
    )
    expect(getByText('TNF')).toBeTruthy()
  })

  it('shows SNF for a Sunday night game and MNF for a Monday night game', () => {
    const sunNight: Game = { ...baseGame, kickoff_slot: 'sun_night' }
    const { getByText, unmount } = render(
      <GameCard game={sunNight} pick={null} isLocked={false} atPickLimit={false} isActiveWeek={true} onPick={noop} onDeselect={noop} onBlockedTap={noop} onLockedTap={noop} />
    )
    expect(getByText('SNF')).toBeTruthy()
    unmount()

    const monNight: Game = { ...baseGame, kickoff_slot: 'mon_night' }
    const { getByText: getByText2 } = render(
      <GameCard game={monNight} pick={null} isLocked={false} atPickLimit={false} isActiveWeek={true} onPick={noop} onDeselect={noop} onBlockedTap={noop} onLockedTap={noop} />
    )
    expect(getByText2('MNF')).toBeTruthy()
  })

  it('shows no primetime badge for a Sunday early, Sunday late, or other game', () => {
    for (const slot of ['sun_early', 'sun_late', 'other'] as const) {
      const game: Game = { ...baseGame, kickoff_slot: slot }
      const { queryByText, unmount } = render(
        <GameCard game={game} pick={null} isLocked={false} atPickLimit={false} isActiveWeek={true} onPick={noop} onDeselect={noop} onBlockedTap={noop} onLockedTap={noop} />
      )
      expect(queryByText('TNF')).toBeNull()
      expect(queryByText('SNF')).toBeNull()
      expect(queryByText('MNF')).toBeNull()
      unmount()
    }
  })

  it('suppresses the TNF badge for a Thursday day game (e.g. Thanksgiving early slate)', () => {
    const game: Game = { ...baseGame, kickoff_slot: 'thu_night', kickoff_time: '2026-11-26T17:30:00Z' }
    const { queryByText } = render(
      <GameCard game={game} pick={null} isLocked={false} atPickLimit={false} isActiveWeek={true} onPick={noop} onDeselect={noop} onBlockedTap={noop} onLockedTap={noop} />
    )
    expect(queryByText('TNF')).toBeNull()
  })

  it('suppresses the MNF badge for a Monday day game', () => {
    const game: Game = { ...baseGame, kickoff_slot: 'mon_night', kickoff_time: '2026-11-30T18:00:00Z' }
    const { queryByText } = render(
      <GameCard game={game} pick={null} isLocked={false} atPickLimit={false} isActiveWeek={true} onPick={noop} onDeselect={noop} onBlockedTap={noop} onLockedTap={noop} />
    )
    expect(queryByText('MNF')).toBeNull()
  })

  it('displays the kickoff time in Central time, not Eastern', () => {
    const { container } = render(
      <GameCard game={baseGame} pick={null} isLocked={false} atPickLimit={false} isActiveWeek={true} onPick={noop} onDeselect={noop} onBlockedTap={noop} onLockedTap={noop} />
    )
    expect(container.textContent).toContain('CDT')
    expect(container.textContent).not.toContain('EDT')
    expect(container.textContent).not.toContain('EST')
  })

  it('appends the broadcast network to the kickoff line when present, omits it when absent', () => {
    const withNetwork: Game = { ...baseGame, broadcast_network: 'CBS' }
    const { container: withContainer, unmount } = render(
      <GameCard game={withNetwork} pick={null} isLocked={false} atPickLimit={false} isActiveWeek={true} onPick={noop} onDeselect={noop} onBlockedTap={noop} onLockedTap={noop} />
    )
    expect(withContainer.textContent).toContain('— CBS')
    unmount()

    const { container: withoutContainer, getByText } = render(
      <GameCard game={baseGame} pick={null} isLocked={false} atPickLimit={false} isActiveWeek={true} onPick={noop} onDeselect={noop} onBlockedTap={noop} onLockedTap={noop} />
    )
    expect(withoutContainer.textContent).not.toContain('—')
    expect(getByText('Tue, 7:15 PM CDT').textContent).not.toContain('—')
  })
})

describe('GameCard locked-game interaction rules', () => {
  it('does not dim the unpicked side of a locked game', () => {
    const { container } = render(
      <GameCard game={baseGame} pick={null} isLocked={true} atPickLimit={false} isActiveWeek={true} onPick={noop} onDeselect={noop} onBlockedTap={noop} onLockedTap={noop} />
    )
    const sides = container.querySelectorAll('div[class*="flex-1"]')
    expect(sides[0].className).not.toContain('opacity-40')
    expect(sides[1].className).not.toContain('opacity-40')
  })

  it('calls onLockedTap when tapping the unpicked side of a locked game', () => {
    let lockedTapCount = 0
    const { container } = render(
      <GameCard game={baseGame} pick={null} isLocked={true} atPickLimit={false} isActiveWeek={true} onPick={() => { throw new Error('onPick should not be called') }} onDeselect={noop} onBlockedTap={noop} onLockedTap={() => { lockedTapCount++ }} />
    )
    const [awaySide] = container.querySelectorAll('div[class*="flex-1"]')
    awaySide.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(lockedTapCount).toBe(1)
  })

  it('does nothing (no toast) when tapping the already-picked side of a locked game', () => {
    let lockedTapCount = 0
    const pick: Pick = { game_id: baseGame.id, picked_team: baseGame.away_team, result: 'pending' }
    const { container } = render(
      <GameCard game={baseGame} pick={pick} isLocked={true} atPickLimit={false} isActiveWeek={true} onPick={noop} onDeselect={() => { throw new Error('onDeselect should not be called') }} onBlockedTap={noop} onLockedTap={() => { lockedTapCount++ }} />
    )
    const [awaySide] = container.querySelectorAll('div[class*="flex-1"]')
    awaySide.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(lockedTapCount).toBe(0)
  })

  it('shows a lock badge on the picked team logo when locked, and none when unlocked', () => {
    const pick: Pick = { game_id: baseGame.id, picked_team: baseGame.away_team, result: 'pending' }
    const { container, rerender } = render(
      <GameCard game={baseGame} pick={pick} isLocked={true} atPickLimit={false} isActiveWeek={true} onPick={noop} onDeselect={noop} onBlockedTap={noop} onLockedTap={noop} />
    )
    expect(container.querySelector('svg')).toBeTruthy()

    rerender(
      <GameCard game={baseGame} pick={pick} isLocked={false} atPickLimit={false} isActiveWeek={true} onPick={noop} onDeselect={noop} onBlockedTap={noop} onLockedTap={noop} />
    )
    expect(container.querySelector('svg')).toBeNull()
  })
})
