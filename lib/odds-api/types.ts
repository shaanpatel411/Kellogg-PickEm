export interface OddsApiOutcome {
  name: string
  price: number
  point?: number
}

export interface OddsApiMarket {
  key: string
  outcomes: OddsApiOutcome[]
}

export interface OddsApiBookmaker {
  key: string
  markets: OddsApiMarket[]
}

export interface OddsApiEvent {
  id: string
  sport_key: string
  commence_time: string
  home_team: string
  away_team: string
  bookmakers: OddsApiBookmaker[]
}

export interface NormalizedGame {
  oddsApiId: string
  homeTeam: string       // short code e.g. "KC"
  awayTeam: string       // short code e.g. "BUF"
  homeTeamFull: string   // short name e.g. "Chiefs"
  awayTeamFull: string   // short name e.g. "Bills"
  favoriteTeam: string | null
  spread: number | null  // home team's line (negative = home favored)
  kickoffTime: string    // ISO string
}
