import { createClient } from '@supabase/supabase-js'

// Bypasses RLS — only use in server code that has already verified the
// caller is authorized (e.g. checked the commissioner role) for the
// specific write being performed.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
