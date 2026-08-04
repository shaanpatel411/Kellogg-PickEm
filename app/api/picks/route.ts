import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/picks?weekId=xxx — fetch the current user's picks for a week
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const weekId = new URL(request.url).searchParams.get('weekId')
  if (!weekId) return NextResponse.json({ error: 'weekId required' }, { status: 400 })

  const { data, error } = await supabase
    .from('picks')
    .select('id, game_id, picked_team, spread_at_pick_time, result')
    .eq('user_id', user.id)
    .eq('week_id', weekId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ picks: data })
}

// PATCH /api/picks — save or update a pick
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gameId, weekId, pickedTeam } = await request.json()
  if (!gameId || !weekId || !pickedTeam) {
    return NextResponse.json({ error: 'gameId, weekId, pickedTeam required' }, { status: 400 })
  }

  // Server-side lock check
  const { data: week } = await supabase
    .from('weeks')
    .select('lock_time')
    .eq('id', weekId)
    .single()

  if (!week) return NextResponse.json({ error: 'Week not found' }, { status: 404 })

  if (new Date() >= new Date(week.lock_time)) {
    return NextResponse.json({ error: 'Picks are locked for this week' }, { status: 423 })
  }

  // Check 5-pick limit (only when adding a new pick, not updating existing)
  const { count: existingCount } = await supabase
    .from('picks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('week_id', weekId)
    .neq('game_id', gameId) // exclude the game being updated

  if ((existingCount ?? 0) >= 5) {
    return NextResponse.json({ error: 'Maximum 5 picks per week' }, { status: 422 })
  }

  // Snapshot the current spread from the game
  const { data: game } = await supabase
    .from('games')
    .select('spread')
    .eq('id', gameId)
    .single()

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 })
  if (game.spread === null) {
    return NextResponse.json({ error: 'Spread not available yet' }, { status: 422 })
  }

  const { data: pick, error } = await supabase
    .from('picks')
    .upsert(
      {
        user_id: user.id,
        week_id: weekId,
        game_id: gameId,
        picked_team: pickedTeam,
        spread_at_pick_time: game.spread,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,game_id' }
    )
    .select('id, game_id, picked_team, spread_at_pick_time, result')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pick })
}

// DELETE /api/picks — remove a pick
export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { gameId, weekId } = await request.json()

  // Lock check
  const { data: week } = await supabase
    .from('weeks')
    .select('lock_time')
    .eq('id', weekId)
    .single()

  if (!week) return NextResponse.json({ error: 'Week not found' }, { status: 404 })

  if (new Date() >= new Date(week.lock_time)) {
    return NextResponse.json({ error: 'Picks are locked for this week' }, { status: 423 })
  }

  const { error } = await supabase
    .from('picks')
    .delete()
    .eq('user_id', user.id)
    .eq('game_id', gameId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
