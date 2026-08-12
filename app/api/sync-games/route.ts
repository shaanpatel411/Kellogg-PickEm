import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncLines } from '@/lib/sync/syncLines'

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

  try {
    const result = await syncLines()
    return NextResponse.json(result)
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
