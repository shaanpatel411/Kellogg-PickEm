'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
import { PicksHeader } from './PicksHeader'
import { GameCard, type Game, type Pick } from './GameCard'
import { WeekDrawer, type WeekSummary } from './WeekDrawer'
import { Toast } from '@/components/ui/Toast'

interface PicksScreenProps {
  initialWeekId: string
  initialGames: Game[]
  initialPicks: Pick[]
  weeks: WeekSummary[]
}

export function PicksScreen({ initialWeekId, initialGames, initialPicks, weeks }: PicksScreenProps) {
  const [currentWeekId, setCurrentWeekId] = useState(initialWeekId)
  const [games, setGames] = useState<Game[]>(initialGames)
  const [picks, setPicks] = useState<Record<string, Pick>>(
    Object.fromEntries(initialPicks.map(p => [p.game_id, p]))
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentWeek = weeks.find(w => w.id === currentWeekId)
  const lockTime = currentWeek?.lock_time ?? new Date(Date.now() + 86400000).toISOString()

  // Debounce timer ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setIsLocked(new Date(lockTime) <= new Date())
  }, [lockTime])

  // Load games + picks when week changes
  async function loadWeek(weekId: string) {
    setCurrentWeekId(weekId)
    setPicks({})
    setGames([])

    const [gamesRes, picksRes] = await Promise.all([
      fetch(`/api/games?weekId=${weekId}`).then(r => r.json()),
      fetch(`/api/picks?weekId=${weekId}`).then(r => r.json()),
    ])

    setGames(gamesRes.games ?? [])
    setPicks(Object.fromEntries((picksRes.picks ?? []).map((p: Pick) => [p.game_id, p])))
    const week = weeks.find(w => w.id === weekId)
    setIsLocked(week ? new Date(week.lock_time) <= new Date() : false)
  }

  const savePick = useCallback((gameId: string, team: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const res = await fetch('/api/picks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, weekId: currentWeekId, pickedTeam: team }),
      })
      if (res.status === 423) {
        // Lock expired mid-session — revert and re-check
        setIsLocked(true)
        setPicks(prev => {
          const next = { ...prev }
          delete next[gameId]
          return next
        })
      }
    }, 300)
  }, [currentWeekId])

  function handlePick(gameId: string, team: string) {
    setPicks(prev => ({
      ...prev,
      [gameId]: { game_id: gameId, picked_team: team, result: 'pending' },
    }))
    savePick(gameId, team)
  }

  async function handleDeselect(gameId: string) {
    setPicks(prev => {
      const next = { ...prev }
      delete next[gameId]
      return next
    })
    await fetch('/api/picks', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, weekId: currentWeekId }),
    })
  }

  function showToast(message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToastMessage(message)
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2500)
  }

  const pickCount = Object.keys(picks).length
  const atPickLimit = pickCount >= 5

  return (
    <div className="w-full max-w-[430px] mx-auto min-h-screen flex flex-col">
      <PicksHeader
        weekNumber={currentWeek?.week_number ?? 0}
        seasonYear={currentWeek?.season_year ?? new Date().getFullYear()}
        lockTime={lockTime}
        pickCount={pickCount}
        isLocked={isLocked}
        onWeekLabelClick={() => setDrawerOpen(true)}
        onExpired={() => setIsLocked(true)}
      />

      <div className="flex flex-col gap-2 p-3 flex-1">
        {games.length === 0 ? (
          <p className="text-center text-gray-9 text-sm mt-8">
            No games for this week yet. Check back soon.
          </p>
        ) : (
          games.map(game => (
            <GameCard
              key={game.id}
              game={game}
              pick={picks[game.id] ?? null}
              isLocked={isLocked}
              atPickLimit={atPickLimit}
              onPick={handlePick}
              onDeselect={handleDeselect}
              onBlockedTap={() => showToast("Picks aren't open for this game yet")}
            />
          ))
        )}
      </div>

      <WeekDrawer
        weeks={weeks}
        currentWeekId={currentWeekId}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSelectWeek={loadWeek}
      />

      <Toast message={toastMessage} />
    </div>
  )
}
