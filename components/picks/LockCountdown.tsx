'use client'
import { useEffect, useState } from 'react'

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Locked'
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

export function LockCountdown({ lockTime, onExpired }: { lockTime: string; onExpired?: () => void }) {
  const [ms, setMs] = useState(() => new Date(lockTime).getTime() - Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = new Date(lockTime).getTime() - Date.now()
      setMs(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        onExpired?.()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockTime, onExpired])

  return (
    <span className="font-mono font-bold text-gold">{formatCountdown(ms)}</span>
  )
}
