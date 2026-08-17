import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PicksScreen } from '@/components/picks/PicksScreen'

export default async function PicksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Load all weeks
  const { data: weeks } = await supabase
    .from('weeks')
    .select('id, week_number, season_year, lock_time, lines_snapshot_at')
    .order('season_year', { ascending: true })
    .order('week_number', { ascending: true })

  if (!weeks || weeks.length === 0) {
    return (
      <main className="w-full max-w-[430px] mx-auto p-6">
        <p className="text-purple-700 font-bold text-sm">NFL 2025</p>
        <h1 className="text-2xl font-black mt-1 mb-4">Kellogg Pick&apos;Em</h1>
        <p className="text-gray-9 text-sm">
          No games scheduled yet. The commissioner needs to sync games first.
        </p>
      </main>
    )
  }

  // Active week = the earliest snapshotted week that hasn't kicked off yet
  // (handles the current week correctly even if a same-day double-sync
  // accidentally snapshotted a later week too) — falling back to the most
  // recently snapshotted week if every snapshotted week has already
  // started (self-healing if a sync ever fails or runs late), and finally
  // to the earliest week overall if nothing has ever been snapshotted.
  const now = Date.now()
  const snapshottedWeeks = weeks.filter(w => w.lines_snapshot_at !== null)
  const activeWeek =
    snapshottedWeeks.find(w => new Date(w.lock_time).getTime() > now) ??
    [...snapshottedWeeks]
      .sort((a, b) => new Date(b.lines_snapshot_at!).getTime() - new Date(a.lines_snapshot_at!).getTime())[0] ??
    weeks[0]

  // Load games and picks for the active week
  const [gamesRes, picksRes] = await Promise.all([
    supabase
      .from('games')
      .select('id, home_team, away_team, home_team_full, away_team_full, spread, kickoff_time, broadcast_network, status, final_home_score, final_away_score')
      .eq('week_id', activeWeek.id)
      .order('kickoff_time', { ascending: true }),
    supabase
      .from('picks')
      .select('id, game_id, picked_team, spread_at_pick_time, result')
      .eq('user_id', user.id)
      .eq('week_id', activeWeek.id),
  ])

  // Load per-week pick counts for the drawer
  const { data: allPicks } = await supabase
    .from('picks')
    .select('week_id, result')
    .eq('user_id', user.id)

  const picksByWeek = (allPicks ?? []).reduce<Record<string, { total: number; wins: number; losses: number; pushes: number }>>((acc, p) => {
    if (!acc[p.week_id]) acc[p.week_id] = { total: 0, wins: 0, losses: 0, pushes: 0 }
    acc[p.week_id].total++
    if (p.result === 'win') acc[p.week_id].wins++
    if (p.result === 'loss') acc[p.week_id].losses++
    if (p.result === 'push') acc[p.week_id].pushes++
    return acc
  }, {})

  const enrichedWeeks = weeks.map(w => ({
    ...w,
    picks: picksByWeek[w.id] ?? { total: 0, wins: 0, losses: 0, pushes: 0 },
  }))

  return (
    <PicksScreen
      initialWeekId={activeWeek.id}
      activeWeekId={activeWeek.id}
      initialGames={gamesRes.data ?? []}
      initialPicks={picksRes.data ?? []}
      weeks={enrichedWeeks}
    />
  )
}
