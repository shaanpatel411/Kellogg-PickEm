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
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          Locked
        </span>
      ) : (
        <span className="text-[11px] font-bold text-gray-9 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0 animate-pulse" />
          Locks in <LockCountdown lockTime={lockAt} onExpired={onExpired} />
        </span>
      )}
    </div>
  )
}
