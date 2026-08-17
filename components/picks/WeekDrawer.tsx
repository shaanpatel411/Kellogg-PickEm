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
  currentWeekSubmittedCount: number
  isOpen: boolean
  onClose: () => void
  onSelectWeek: (weekId: string) => void
}

export function WeekDrawer({ weeks, currentWeekId, currentWeekSubmittedCount, isOpen, onClose, onSelectWeek }: WeekDrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    sheetRef.current?.focus()

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const focusables = sheetRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusables || focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      previouslyFocusedRef.current?.focus()
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const now = new Date()

  function getWeekLabel(w: WeekSummary) {
    const isLocked = new Date(w.lock_time) <= now
    const isCurrent = w.id === currentWeekId
    const displayTotal = isCurrent ? currentWeekSubmittedCount : w.picks.total
    const hasPicks = displayTotal > 0
    const isGraded = w.picks.wins + w.picks.losses + w.picks.pushes > 0

    if (isCurrent && !isLocked) return `${displayTotal}/5`
    if (isGraded) return `${w.picks.wins}-${w.picks.losses}`
    if (hasPicks) return `${displayTotal}/5`
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
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ background: 'rgba(20,10,30,.45)', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="week-drawer-title"
        tabIndex={-1}
        className="w-full max-w-[430px] bg-white rounded-t-[20px] px-4 pt-3 pb-8 shadow-xl outline-none"
      >
        <div className="w-9 h-1 rounded bg-gray-4 mx-auto mb-4" />
        <p id="week-drawer-title" className="text-[10px] font-bold tracking-widest uppercase text-gray-9 mb-3">
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
