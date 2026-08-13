'use client'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PicksHeader } from './PicksHeader'
import { GameCard, type Game, type Pick } from './GameCard'
import { DayGroupHeader } from './DayGroupHeader'
import { WeekDrawer, type WeekSummary } from './WeekDrawer'
import { Toast } from '@/components/ui/Toast'
import { groupGamesByDay, getKickoffDayKey } from '@/lib/schedule'

interface PicksScreenProps {
  initialWeekId: string
  activeWeekId: string
  initialGames: Game[]
  initialPicks: Pick[]
  weeks: WeekSummary[]
}

export function PicksScreen({ initialWeekId, activeWeekId, initialGames, initialPicks, weeks }: PicksScreenProps) {
  const [currentWeekId, setCurrentWeekId] = useState(initialWeekId)
  const [games, setGames] = useState<Game[]>(initialGames)
  const [picks, setPicks] = useState<Record<string, Pick>>(
    Object.fromEntries(initialPicks.map(p => [p.game_id, p]))
  )
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lockedDayKeys, setLockedDayKeys] = useState<Record<string, boolean>>({})
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  const currentWeek = weeks.find(w => w.id === currentWeekId)
  const isActiveWeek = currentWeekId === activeWeekId

  const dayGroups = useMemo(() => groupGamesByDay(games), [games])

  // Debounce timer ref
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLockedDayKeys(
      Object.fromEntries(dayGroups.map(g => [g.dayKey, new Date(g.lockAt).getTime() <= Date.now()]))
    )
  }, [dayGroups])

  function handleDayExpired(dayKey: string) {
    setLockedDayKeys(prev => ({ ...prev, [dayKey]: true }))
  }

  // Refresh server data (activeWeekId, weeks) when the tab regains focus or
  // becomes visible again, so a long-lived session picks up a real week
  // advance without requiring a manual reload.
  useEffect(() => {
    function handleVisibleOrFocused() {
      if (document.visibilityState === 'visible') {
        router.refresh()
      }
    }
    window.addEventListener('focus', handleVisibleOrFocused)
    document.addEventListener('visibilitychange', handleVisibleOrFocused)
    return () => {
      window.removeEventListener('focus', handleVisibleOrFocused)
      document.removeEventListener('visibilitychange', handleVisibleOrFocused)
    }
  }, [router])

  // Load games + picks when week changes
  async function loadWeek(weekId: string) {
    setCurrentWeekId(weekId)
    setPicks({})
    setGames([])

    const [gamesRes, picksRes] = await Promise.all([
      fetch(`/api/games?weekId=${weekId}`).then(r => r.json()),
      fetch(`/api/picks?weekId=${weekId}`).then(r => r.json()),
    ])

    const loadedGames: Game[] = gamesRes.games ?? []
    setGames(loadedGames)
    setPicks(Object.fromEntries((picksRes.picks ?? []).map((p: Pick) => [p.game_id, p])))
    setLockedDayKeys(
      Object.fromEntries(
        groupGamesByDay(loadedGames).map(g => [g.dayKey, new Date(g.lockAt).getTime() <= Date.now()])
      )
    )
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
        // Lock expired mid-session — revert and re-check that game's day group
        const game = games.find(g => g.id === gameId)
        if (game) {
          setLockedDayKeys(prev => ({ ...prev, [getKickoffDayKey(game.kickoff_time)]: true }))
        }
        setPicks(prev => {
          const next = { ...prev }
          delete next[gameId]
          return next
        })
      }
    }, 300)
  }, [currentWeekId, games])

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
        pickCount={pickCount}
        onWeekLabelClick={() => setDrawerOpen(true)}
      />

      <div className="flex flex-col gap-2 p-3 flex-1">
        {games.length === 0 ? (
          <p className="text-center text-gray-9 text-sm mt-8">
            No games for this week yet. Check back soon.
          </p>
        ) : (
          dayGroups.map(group => {
            const groupLocked = lockedDayKeys[group.dayKey] ?? false
            return (
              <div key={group.dayKey} className="flex flex-col gap-2">
                <DayGroupHeader
                  label={group.label}
                  lockAt={group.lockAt}
                  isLocked={groupLocked}
                  onExpired={() => handleDayExpired(group.dayKey)}
                />
                {group.games.map(game => (
                  <GameCard
                    key={game.id}
                    game={game}
                    pick={picks[game.id] ?? null}
                    isLocked={groupLocked}
                    atPickLimit={atPickLimit}
                    isActiveWeek={isActiveWeek}
                    onPick={handlePick}
                    onDeselect={handleDeselect}
                    onBlockedTap={() => showToast("Picks aren't open for this game yet")}
                    onLockedTap={() => showToast('Picks are locked for this game')}
                  />
                ))}
              </div>
            )
          })
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
