import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weekId = new URL(request.url).searchParams.get('weekId')
  if (!weekId) return NextResponse.json({ error: 'weekId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('games')
    .select('id, home_team, away_team, home_team_full, away_team_full, spread, kickoff_time, broadcast_network, status, final_home_score, final_away_score')
    .eq('week_id', weekId)
    .order('kickoff_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ games: data })
}
