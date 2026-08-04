'use client'
import { useEffect, useRef } from 'react'

export interface WeekSummary {
  id: string
  week_number: number
  season_year: number
  lock_time: string
  picks: { total: number; wins: number; losses: number; pushes: number }
}

interface WeekDrawerProps {
  weeks: WeekSummary[]
  currentWeekId: string
  isOpen: boolean
  onClose: () => void
  onSelectWeek: (weekId: string) => void
}

export function WeekDrawer({ weeks, currentWeekId, isOpen, onClose, onSelectWeek }: WeekDrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const now = new Date()

  function getWeekLabel(w: WeekSummary) {
    const isLocked = new Date(w.lock_time) <= now
    const isCurrent = w.id === currentWeekId
    const hasPicks = w.picks.total > 0
    const isGraded = w.picks.wins + w.picks.losses + w.picks.pushes > 0

    if (isCurrent && !isLocked) return `${w.picks.total}/5`
    if (isGraded) return `${w.picks.wins}-${w.picks.losses}`
    if (hasPicks) return `${w.picks.total}/5`
    return '—'
  }

  function getWeekStyle(w: WeekSummary): string {
    const isCurrent = w.id === currentWeekId
    const isFuture = new Date(w.lock_time) > now && !isCurrent
    if (isCurrent) return 'bg-purple-700 text-white'
    if (isFuture && w.picks.total === 0) return 'bg-white border border-gray-1 text-gray-4'
    return 'bg-purple-100 text-purple-700'
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(20,10,30,.45)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="w-full max-w-[430px] bg-white rounded-t-2xl px-4 pt-3 pb-8 shadow-xl">
        <div className="w-9 h-1 rounded bg-gray-4 mx-auto mb-4" />
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-9 mb-3">
          Jump to week
        </p>
        <div className="grid grid-cols-5 gap-2">
          {weeks.map(w => (
            <button
              key={w.id}
              onClick={() => { onSelectWeek(w.id); onClose() }}
              className={`rounded-lg py-2 text-center transition-colors ${getWeekStyle(w)}`}
            >
              <div className="text-[13px] font-bold">{w.week_number}</div>
              <div className="text-[9px] font-mono mt-0.5">{getWeekLabel(w)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
