'use client'
import { LockCountdown } from './LockCountdown'

interface DayGroupHeaderProps {
  label: string
  lockAt: string
  isLocked: boolean
  onExpired: () => void
}

export function DayGroupHeader({ label, lockAt, isLocked, onExpired }: DayGroupHeaderProps) {
  return (
    <div className="flex items-center justify-between px-1 py-1">
      <span className="text-[11px] font-extrabold tracking-widest text-gray-11">{label}</span>
      {isLocked ? (
        <span className="text-[11px] font-bold text-gray-9 flex items-center gap-1">
          🔒 Locked
        </span>
      ) : (
        <span className="text-[11px] font-bold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0 animate-pulse" />
          Locks in <LockCountdown lockTime={lockAt} onExpired={onExpired} />
        </span>
      )}
    </div>
  )
}
