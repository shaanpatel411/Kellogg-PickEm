import { createAdminClient } from '@/lib/supabase/admin'
import { fetchGamesForWeek } from '@/lib/odds-api/adapter'
import type { NormalizedGame } from '@/lib/odds-api/types'
import { fetchEspnScoreboard, matchBroadcastNetworks, gameMatchKey } from '@/lib/espn/scoreboard'
import { getSeasonInfo, computeKickoffSlot } from '@/lib/schedule'
import { selectTargetWeek, type WeekCandidate } from '@/lib/sync/targetWeek'

export interface SyncResult {
  message: string
  weeksProcessed: { weekNumber: number; seasonYear: number; snapshotted: boolean }[]
  synced: number
}

interface WeekBucket {
  key: string
  id: string
  lockTime: string
  alreadySnapshotted: boolean
  weekNumber: number
  seasonYear: number
  games: NormalizedGame[]
}

export async function syncLines(): Promise<SyncResult> {
  const admin = createAdminClient()
  const games = await fetchGamesForWeek()

  if (games.length === 0) {
    return { message: 'No games returned from API', weeksProcessed: [], synced: 0 }
  }

  // Bucket by week — a single Odds API call can return games spanning many
  // weeks (confirmed: up to a full season, ~272 games/18 weeks, in one call).
  const gamesByWeek = new Map<string, { weekNumber: number; seasonYear: number; games: NormalizedGame[] }>()
  for (const g of games) {
    const kickoff = new Date(g.kickoffTime)
    const { weekNumber, seasonYear } = getSeasonInfo(kickoff)
    const key = `${seasonYear}-${weekNumber}`
    if (!gamesByWeek.has(key)) gamesByWeek.set(key, { weekNumber, seasonYear, games: [] })
    gamesByWeek.get(key)!.games.push(g)
  }

  // Upsert each week row first (creates new weeks, refreshes lock_time for
  // existing ones — unchanged from prior behavior) so we know each week's
  // id and current lines_snapshot_at status before deciding the target.
  const weekBuckets: WeekBucket[] = []
  for (const [key, { weekNumber, seasonYear, games: weekGames }] of gamesByWeek) {
    const lockTime = new Date(
      Math.min(...weekGames.map(g => new Date(g.kickoffTime).getTime()))
    ).toISOString()

    const { data: week, error: weekError } = await admin
      .from('weeks')
      .upsert(
        { week_number: weekNumber, season_year: seasonYear, lock_time: lockTime },
        { onConflict: 'week_number,season_year' }
      )
      .select('id, lines_snapshot_at')
      .single()

    if (weekError) throw weekError

    weekBuckets.push({
      key,
      id: week.id,
      lockTime,
      alreadySnapshotted: week.lines_snapshot_at !== null,
      weekNumber,
      seasonYear,
      games: weekGames,
    })
  }

  const candidates: WeekCandidate[] = weekBuckets.map(w => ({
    id: w.id,
    lockTime: w.lockTime,
    alreadySnapshotted: w.alreadySnapshotted,
  }))
  const targetWeekId = selectTargetWeek(candidates, new Date())

  // Broadcast enrichment is best-effort and covers every week in this batch,
  // regardless of locking status — it's not subject to the freeze rule.
  const allKickoffMs = games.map(g => new Date(g.kickoffTime).getTime())
  let broadcastMap = new Map<string, string>()
  try {
    const events = await fetchEspnScoreboard(
      new Date(Math.min(...allKickoffMs)),
      new Date(Math.max(...allKickoffMs))
    )
    broadcastMap = matchBroadcastNetworks(
      games.map(g => ({ home_team: g.homeTeam, away_team: g.awayTeam, kickoff_time: g.kickoffTime })),
      events
    )
  } catch (err) {
    console.error('ESPN broadcast enrichment failed, continuing without it:', err)
  }

  let totalSynced = 0
  const weeksProcessed: SyncResult['weeksProcessed'] = []

  for (const week of weekBuckets) {
    const isTarget = week.id === targetWeekId

    const gameRows = week.games.map(g => {
      const base = {
        week_id: week.id,
        home_team: g.homeTeam,
        away_team: g.awayTeam,
        home_team_full: g.homeTeamFull,
        away_team_full: g.awayTeamFull,
        kickoff_time: g.kickoffTime,
        kickoff_slot: computeKickoffSlot(g.kickoffTime),
        broadcast_network: broadcastMap.get(gameMatchKey(g.awayTeam, g.homeTeam, g.kickoffTime)) ?? null,
        odds_api_id: g.oddsApiId,
        updated_at: new Date().toISOString(),
      }
      // Only the target week's upsert includes spread/favorite_team. Every
      // other week's upsert omits these keys entirely, so Postgres's
      // ON CONFLICT DO UPDATE leaves any existing value untouched (frozen)
      // and a brand-new row just gets the column default (NULL, withheld).
      return isTarget ? { ...base, spread: g.spread, favorite_team: g.favoriteTeam } : base
    })

    const { error: gamesError } = await admin
      .from('games')
      .upsert(gameRows, { onConflict: 'odds_api_id' })
    if (gamesError) throw gamesError

    if (isTarget && !week.alreadySnapshotted) {
      const { error: snapshotError } = await admin
        .from('weeks')
        .update({ lines_snapshot_at: new Date().toISOString() })
        .eq('id', week.id)
        .is('lines_snapshot_at', null) // guard against a concurrent/retried run double-writing
      if (snapshotError) throw snapshotError
    }

    totalSynced += week.games.length
    weeksProcessed.push({ weekNumber: week.weekNumber, seasonYear: week.seasonYear, snapshotted: isTarget })
  }

  return { message: 'Sync complete', weeksProcessed, synced: totalSynced }
}
