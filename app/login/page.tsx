'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-page)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-xs font-bold tracking-widest uppercase text-purple-700 mb-1">
            NFL 2025
          </p>
          <h1 className="text-3xl font-black text-gray-11">
            Kellogg Pick&apos;Em
          </h1>
        </div>

        {sent ? (
          <div className="bg-green-light rounded-card p-5">
            <p className="font-semibold text-green">Check your email.</p>
            <p className="text-sm text-gray-9 mt-1">
              We sent a link to <strong>{email}</strong>. Click it to sign in.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-bold tracking-wider uppercase text-gray-9 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@kellogg.northwestern.edu"
                className="w-full border border-gray-4 rounded-[6px] px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
              />
            </div>
            {error && <p className="text-sm text-red">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-700 hover:bg-purple-900 text-white font-bold py-3 rounded-pill transition-colors disabled:opacity-60"
            >
              {loading ? 'Sending...' : 'Send sign-in link'}
            </button>
            <p className="text-xs text-center text-gray-9">
              Sign-ups are invite-only. Contact the commissioner if you can&apos;t access your account.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
