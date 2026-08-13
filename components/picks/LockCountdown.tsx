'use client'
import { useEffect, useRef, useState } from 'react'

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

function colorClass(ms: number): string {
  if (ms <= 0) return 'text-gray-9'
  const hours = ms / (1000 * 60 * 60)
  if (hours < 2) return 'text-red'
  if (hours < 24) return 'text-gold'
  return 'text-gray-9'
}

export function LockCountdown({ lockTime, onExpired }: { lockTime: string; onExpired?: () => void }) {
  const [ms, setMs] = useState(() => new Date(lockTime).getTime() - Date.now())
  const onExpiredRef = useRef(onExpired)
  useEffect(() => { onExpiredRef.current = onExpired })

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = new Date(lockTime).getTime() - Date.now()
      setMs(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        onExpiredRef.current?.()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [lockTime])

  return (
    <span className={`font-mono font-bold ${colorClass(ms)}`}>{formatCountdown(ms)}</span>
  )
}
