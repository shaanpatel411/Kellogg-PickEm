import { describe, it, expect } from 'vitest'
import { matchBroadcastNetworks, gameMatchKey, type EspnBroadcastEvent, type GameForMatching } from './scoreboard'

const mockEvents: EspnBroadcastEvent[] = [
  {
    date: '2026-09-13T17:00:00Z',
    competitions: [{
      competitors: [
        { homeAway: 'home', team: { abbreviation: 'CIN' } },
        { homeAway: 'away', team: { abbreviation: 'TB' } },
      ],
      broadcasts: [{ names: ['FOX'] }],
    }],
  },
  {
    date: '2026-09-13T17:00:00Z',
    competitions: [{
      competitors: [
        { homeAway: 'home', team: { abbreviation: 'NYJ' } },
        { homeAway: 'away', team: { abbreviation: 'TEN' } },
      ],
      broadcasts: [], // no broadcast announced yet
    }],
  },
]

describe('matchBroadcastNetworks', () => {
  it('matches a game to its network by home/away team abbreviation and date', () => {
    const games: GameForMatching[] = [{ home_team: 'CIN', away_team: 'TB', kickoff_time: '2026-09-13T17:00:00Z' }]
    const result = matchBroadcastNetworks(games, mockEvents)
    expect(result.get(gameMatchKey('TB', 'CIN', '2026-09-13T17:00:00Z'))).toBe('FOX')
  })

  it('does not collide when the same two teams play twice in a season on different dates', () => {
    // Division rivals play each other twice a year — matching by team pair
    // alone would wrongly apply one game's network to both.
    const games: GameForMatching[] = [
      { home_team: 'CIN', away_team: 'TB', kickoff_time: '2026-09-13T17:00:00Z' }, // matches mockEvents
      { home_team: 'CIN', away_team: 'TB', kickoff_time: '2026-12-06T18:00:00Z' }, // same teams, different date — no matching event
    ]
    const result = matchBroadcastNetworks(games, mockEvents)
    expect(result.get(gameMatchKey('TB', 'CIN', '2026-09-13T17:00:00Z'))).toBe('FOX')
    expect(result.has(gameMatchKey('TB', 'CIN', '2026-12-06T18:00:00Z'))).toBe(false)
  })

  it('omits a game from the result when ESPN has no broadcast entry for it', () => {
    const games: GameForMatching[] = [{ home_team: 'NYJ', away_team: 'TEN', kickoff_time: '2026-09-13T17:00:00Z' }]
    const result = matchBroadcastNetworks(games, mockEvents)
    expect(result.has(gameMatchKey('TEN', 'NYJ', '2026-09-13T17:00:00Z'))).toBe(false)
  })

  it('omits a game from the result when no ESPN event matches at all', () => {
    const games: GameForMatching[] = [{ home_team: 'SEA', away_team: 'NE', kickoff_time: '2026-09-13T17:00:00Z' }]
    const result = matchBroadcastNetworks(games, mockEvents)
    expect(result.has(gameMatchKey('NE', 'SEA', '2026-09-13T17:00:00Z'))).toBe(false)
  })

  it('handles an empty events list', () => {
    const games: GameForMatching[] = [{ home_team: 'CIN', away_team: 'TB', kickoff_time: '2026-09-13T17:00:00Z' }]
    expect(matchBroadcastNetworks(games, []).size).toBe(0)
  })
})
