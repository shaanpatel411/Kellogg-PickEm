import { describe, it, expect, vi, afterEach } from 'vitest'
import { matchBroadcastNetworks, gameMatchKey, fetchEspnScoreboard, type EspnBroadcastEvent, type GameForMatching } from './scoreboard'

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

describe('fetchEspnScoreboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests limit=1000 and shifts the start date back a day to cover the ET/UTC boundary', async () => {
    let capturedUrl: string | undefined
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      capturedUrl = url
      return { ok: true, json: async () => ({ events: [] }) } as Response
    }))

    await fetchEspnScoreboard(new Date('2026-09-05T00:00:00Z'), new Date('2026-09-08T00:00:00Z'))

    expect(capturedUrl).toContain('limit=1000')
    expect(capturedUrl).toContain('dates=20260904-20260908') // start shifted back a day from input
  })
})
