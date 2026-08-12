import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/weeks — all weeks, each annotated with the user's pick count for that week
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: weeks, error: weeksError } = await supabase
    .from('weeks')
    .select('id, week_number, season_year, lock_time')
    .order('season_year', { ascending: true })
    .order('week_number', { ascending: true })

  if (weeksError) return NextResponse.json({ error: weeksError.message }, { status: 500 })

  // For each week, count this user's picks and wins/losses
  const weekIds = (weeks ?? []).map(w => w.id)
  const { data: picks } = await supabase
    .from('picks')
    .select('week_id, result')
    .eq('user_id', user.id)
    .in('week_id', weekIds)

  const picksByWeek = (picks ?? []).reduce<Record<string, { total: number; wins: number; losses: number; pushes: number }>>((acc, p) => {
    if (!acc[p.week_id]) acc[p.week_id] = { total: 0, wins: 0, losses: 0, pushes: 0 }
    acc[p.week_id].total++
    if (p.result === 'win') acc[p.week_id].wins++
    if (p.result === 'loss') acc[p.week_id].losses++
    if (p.result === 'push') acc[p.week_id].pushes++
    return acc
  }, {})

  const enrichedWeeks = (weeks ?? []).map(w => ({
    ...w,
    picks: picksByWeek[w.id] ?? { total: 0, wins: 0, losses: 0, pushes: 0 },
  }))

  return NextResponse.json({ weeks: enrichedWeeks })
}
