'use client'
import { teamLogoUrl } from '@/lib/teams'
import { spreadLabel, type Game } from './GameCard'

export interface SubmitSlot {
  game: Game
  team: string
  isSynced: boolean
}

interface SubmitBarProps {
  slots: SubmitSlot[]
  isDirty: boolean
  isSubmitting: boolean
  onSubmit: () => void
}

const TOTAL_SLOTS = 5

export function SubmitBar({ slots, isDirty, isSubmitting, onSubmit }: SubmitBarProps) {
  const buttonState: 'empty' | 'dirty' | 'synced' = slots.length === 0 ? 'empty' : isDirty ? 'dirty' : 'synced'

  return (
    <div className="fixed bottom-[68px] left-1/2 -translate-x-1/2 z-40 w-full max-w-[430px] flex items-center justify-between gap-3 px-3 py-2.5 bg-white border-[1.5px] border-gray-1 rounded-panel shadow-lg">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
          const slot = slots[i]
          if (!slot) {
            return (
              <span key={i} className="w-9 h-9 rounded-full bg-white border-2 border-dashed border-gray-1 flex-shrink-0" />
            )
          }
          const isHome = slot.team === slot.game.home_team
          const ringColor = slot.isSynced ? 'border-green' : 'border-purple-700'
          const badgeColor = slot.isSynced ? 'bg-green text-white' : 'bg-purple-700 text-white'
          return (
            <span key={slot.game.id} className={`relative w-9 h-9 rounded-full border-2 ${ringColor} flex-shrink-0 bg-white`}>
              <img
                src={teamLogoUrl(slot.team)}
                alt=""
                className="w-full h-full object-contain p-0.5"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
              <span className={`absolute -bottom-1 -right-1 text-[8px] font-bold font-mono px-1 py-[1px] rounded-pill ${badgeColor}`}>
                {spreadLabel(slot.game.spread, isHome)}
              </span>
            </span>
          )
        })}
      </div>

      {buttonState === 'empty' && (
        <button disabled className="px-[22px] py-[11px] rounded-pill bg-gray-4 text-white text-sm font-bold cursor-default flex-shrink-0">
          Submit
        </button>
      )}
      {buttonState === 'dirty' && (
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-[22px] py-[11px] rounded-pill bg-purple-700 text-white text-sm font-bold flex-shrink-0"
        >
          {isSubmitting ? 'Submitting…' : 'Submit'}
        </button>
      )}
      {buttonState === 'synced' && (
        <button disabled className="px-[22px] py-[11px] rounded-pill bg-green-light text-green text-sm font-bold cursor-default flex-shrink-0">
          Submitted
        </button>
      )}
    </div>
  )
}
