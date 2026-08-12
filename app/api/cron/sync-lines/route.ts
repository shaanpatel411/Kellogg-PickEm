import { NextResponse } from 'next/server'
import { syncLines } from '@/lib/sync/syncLines'

// A full-season sync run does up to ~2×18 sequential Supabase round trips
// plus two upstream API calls — give it headroom above Vercel's default.
export const maxDuration = 60

// Vercel Cron invokes this route via GET, with an Authorization header
// containing CRON_SECRET — see vercel.json for the schedule.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  // Fail closed: if CRON_SECRET itself is unset, never authorize — otherwise
  // the check degrades to comparing against the literal string
  // "Bearer undefined", which anyone can send.
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncLines()
    return NextResponse.json(result)
  } catch (err) {
    console.error('Cron sync error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
