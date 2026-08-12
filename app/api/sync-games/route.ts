import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchGamesForWeek } from '@/lib/odds-api/adapter'
import type { NormalizedGame } from '@/lib/odds-api/types'
import { getSeasonInfo } from '@/lib/schedule'

export async function POST(request: Request) {
  const supabase = await createClient()

  // Verify the caller is the commissioner
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'commissioner') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Writes below use the admin client (service_role key) to bypass RLS,
  // since weeks/games intentionally have no client-write policy. Safe here
  // because we've already verified the caller is the commissioner above.
  const admin = createAdminClient()

  try {
    const games = await fetchGamesForWeek()
    if (games.length === 0) {
      return NextResponse.json({ message: 'No games returned from API', synced: 0 })
    }

    // The Odds API returns every currently-listed game, which can span many
    // weeks (or the whole season) at once — not just "this week". Bucket
    // each game into its own week based on its own kickoff time, rather
    // than computing one week for the entire batch.
    const gamesByWeek = new Map<string, { weekNumber: number; seasonYear: number; games: NormalizedGame[] }>()
    for (const g of games) {
      const kickoff = new Date(g.kickoffTime)
      const { weekNumber, seasonYear } = getSeasonInfo(kickoff)
      const key = `${seasonYear}-${weekNumber}`
      if (!gamesByWeek.has(key)) {
        gamesByWeek.set(key, { weekNumber, seasonYear, games: [] })
      }
      gamesByWeek.get(key)!.games.push(g)
    }

    let totalSynced = 0
    const syncedWeeks: { weekNumber: number; seasonYear: number; lockTime: string }[] = []

    for (const { weekNumber, seasonYear, games: weekGames } of gamesByWeek.values()) {
      // Lock time = earliest kickoff within that week
      const lockTime = new Date(
        Math.min(...weekGames.map(g => new Date(g.kickoffTime).getTime()))
      ).toISOString()

      const { data: week, error: weekError } = await admin
        .from('weeks')
        .upsert(
          { week_number: weekNumber, season_year: seasonYear, lock_time: lockTime },
          { onConflict: 'week_number,season_year' }
        )
        .select('id')
        .single()

      if (weekError) throw weekError

      const gameRows = weekGames.map(g => ({
        week_id: week.id,
        home_team: g.homeTeam,
        away_team: g.awayTeam,
        home_team_full: g.homeTeamFull,
        away_team_full: g.awayTeamFull,
        favorite_team: g.favoriteTeam,
        spread: g.spread,
        kickoff_time: g.kickoffTime,
        odds_api_id: g.oddsApiId,
        updated_at: new Date().toISOString(),
      }))

      const { error: gamesError } = await admin
        .from('games')
        .upsert(gameRows, { onConflict: 'odds_api_id' })

      if (gamesError) throw gamesError

      totalSynced += weekGames.length
      syncedWeeks.push({ weekNumber, seasonYear, lockTime })
    }

    return NextResponse.json({
      message: 'Sync complete',
      weeks: syncedWeeks,
      synced: totalSynced,
    })
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
