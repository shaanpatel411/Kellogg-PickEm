import { NextResponse } from 'next/server'
import { syncLines } from '@/lib/sync/syncLines'

// Vercel Cron invokes this route via GET, with an Authorization header
// containing CRON_SECRET — see vercel.json for the schedule.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
