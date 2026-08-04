import { describe, it, expect } from 'vitest'
import { normalizeEvent } from './adapter'
import type { OddsApiEvent } from './types'

const mockEvent: OddsApiEvent = {
  id: 'abc123',
  sport_key: 'americanfootball_nfl',
  commence_time: '2025-09-28T17:00:00Z',
  home_team: 'Kansas City Chiefs',
  away_team: 'Buffalo Bills',
  bookmakers: [
    {
      key: 'draftkings',
      markets: [
        {
          key: 'spreads',
          outcomes: [
            { name: 'Kansas City Chiefs', price: -110, point: -2 },
            { name: 'Buffalo Bills', price: -110, point: 2 },
          ],
        },
      ],
    },
  ],
}

describe('normalizeEvent', () => {
  it('extracts team codes, spread, and kickoff from a raw Odds API event', () => {
    const result = normalizeEvent(mockEvent)
    expect(result.oddsApiId).toBe('abc123')
    expect(result.homeTeam).toBe('KC')
    expect(result.awayTeam).toBe('BUF')
    expect(result.homeTeamFull).toBe('Chiefs')
    expect(result.awayTeamFull).toBe('Bills')
    expect(result.spread).toBe(-2)
    expect(result.favoriteTeam).toBe('KC')
    expect(result.kickoffTime).toBe('2025-09-28T17:00:00Z')
  })

  it('returns null spread when no bookmaker has spreads data', () => {
    const noSpread = { ...mockEvent, bookmakers: [] }
    const result = normalizeEvent(noSpread)
    expect(result.spread).toBeNull()
    expect(result.favoriteTeam).toBeNull()
  })
})
