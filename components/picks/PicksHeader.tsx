'use client'

interface PicksHeaderProps {
  weekNumber: number
  seasonYear: number
  pickCount: number
  onWeekLabelClick: () => void
}

export function PicksHeader({
  weekNumber, seasonYear, pickCount, onWeekLabelClick,
}: PicksHeaderProps) {
  return (
    <div className="bg-purple-700 px-4 pt-4 pb-3 text-white">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-bold tracking-widest uppercase opacity-65">
            NFL {seasonYear}
          </p>
          <h1 className="text-xl font-black mt-0.5">Your picks</h1>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className={`text-[22px] font-black font-mono leading-none ${pickCount === 5 ? 'text-green' : 'text-white'}`}>
            {pickCount}/5
          </span>
          <span className="text-[10px] uppercase tracking-widest opacity-65">selected</span>
        </div>
      </div>

      {/* Week label — tappable to open week drawer */}
      <button
        onClick={onWeekLabelClick}
        className="mt-2.5 w-full flex items-center justify-between bg-white/10 rounded-lg px-3 py-1.5 text-left"
      >
        <div>
          <span className="text-sm font-bold">Week {weekNumber}</span>
          <span className="text-[10px] opacity-60 ml-2">tap to browse</span>
        </div>
        <span className="text-xs opacity-70">▾</span>
      </button>
    </div>
  )
}
