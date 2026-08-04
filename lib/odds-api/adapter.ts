import { toTeamCode, TEAM_SHORT_NAMES } from '@/lib/teams'
import type { OddsApiEvent, NormalizedGame } from './types'

const PREFERRED_BOOKMAKERS = ['draftkings', 'fanduel', 'betmgm']

function getSpread(event: OddsApiEvent): { homePoint: number | null; bookmakerKey: string | null } {
  // Try preferred bookmakers first, then fall back to first available
  const ordered = [
    ...PREFERRED_BOOKMAKERS.map(k => event.bookmakers.find(b => b.key === k)),
    ...event.bookmakers,
  ].filter(Boolean) as typeof event.bookmakers

  for (const bookmaker of ordered) {
    const spreadsMarket = bookmaker.markets.find(m => m.key === 'spreads')
    if (!spreadsMarket) continue
    const homeOutcome = spreadsMarket.outcomes.find(o => o.name === event.home_team)
    if (homeOutcome?.point !== undefined) {
      return { homePoint: homeOutcome.point, bookmakerKey: bookmaker.key }
    }
  }
  return { homePoint: null, bookmakerKey: null }
}

export function normalizeEvent(event: OddsApiEvent): NormalizedGame {
  const homeCode = toTeamCode(event.home_team)
  const awayCode = toTeamCode(event.away_team)
  const { homePoint } = getSpread(event)

  let favoriteTeam: string | null = null
  if (homePoint !== null) {
    favoriteTeam = homePoint < 0 ? homeCode : homePoint > 0 ? awayCode : null
  }

  return {
    oddsApiId: event.id,
    homeTeam: homeCode,
    awayTeam: awayCode,
    homeTeamFull: TEAM_SHORT_NAMES[homeCode] ?? event.home_team,
    awayTeamFull: TEAM_SHORT_NAMES[awayCode] ?? event.away_team,
    favoriteTeam,
    spread: homePoint,
    kickoffTime: event.commence_time,
  }
}

export async function fetchGamesForWeek(): Promise<NormalizedGame[]> {
  const url = new URL('https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds')
  url.searchParams.set('apiKey', process.env.ODDS_API_KEY!)
  url.searchParams.set('regions', 'us')
  url.searchParams.set('markets', 'spreads')
  url.searchParams.set('oddsFormat', 'american')

  const response = await fetch(url.toString(), { next: { revalidate: 0 } })
  if (!response.ok) throw new Error(`Odds API error: ${response.status}`)

  const events: OddsApiEvent[] = await response.json()
  return events.map(normalizeEvent)
}
