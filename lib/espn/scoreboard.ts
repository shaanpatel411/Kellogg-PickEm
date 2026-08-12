export interface EspnBroadcastEvent {
  date: string
  competitions: Array<{
    competitors: Array<{ homeAway: 'home' | 'away'; team: { abbreviation: string } }>
    broadcasts?: Array<{ names: string[] }>
  }>
}

export interface GameForMatching {
  home_team: string
  away_team: string
  kickoff_time: string
}

// Team pair alone isn't a unique key — division rivals play each other
// twice a season. Truncating to the date (not full timestamp) tolerates
// any minor drift between the Odds API's and ESPN's kickoff timestamps
// for what's still clearly the same game.
export function gameMatchKey(awayTeam: string, homeTeam: string, kickoffTimeIso: string): string {
  return `${awayTeam}@${homeTeam}@${kickoffTimeIso.slice(0, 10)}`
}

export function matchBroadcastNetworks(
  games: GameForMatching[],
  events: EspnBroadcastEvent[]
): Map<string, string> {
  const networkByKey = new Map<string, string>()
  for (const event of events) {
    const comp = event.competitions[0]
    if (!comp) continue
    const home = comp.competitors.find(c => c.homeAway === 'home')?.team.abbreviation
    const away = comp.competitors.find(c => c.homeAway === 'away')?.team.abbreviation
    const network = comp.broadcasts?.[0]?.names?.[0]
    if (!home || !away || !network) continue
    networkByKey.set(gameMatchKey(away, home, event.date), network)
  }

  const result = new Map<string, string>()
  for (const g of games) {
    const key = gameMatchKey(g.away_team, g.home_team, g.kickoff_time)
    const network = networkByKey.get(key)
    if (network) result.set(key, network)
  }
  return result
}

function formatEspnDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

export async function fetchEspnScoreboard(startDate: Date, endDate: Date): Promise<EspnBroadcastEvent[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${formatEspnDate(startDate)}-${formatEspnDate(endDate)}`
  const response = await fetch(url, { next: { revalidate: 0 } })
  if (!response.ok) throw new Error(`ESPN scoreboard error: ${response.status}`)
  const data = await response.json()
  return data.events ?? []
}
