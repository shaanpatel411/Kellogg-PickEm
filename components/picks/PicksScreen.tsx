'use client'
import { useState, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PicksHeader } from './PicksHeader'
import { GameCard, type Game, type Pick } from './GameCard'
import { DayGroupHeader } from './DayGroupHeader'
import { SubmitBar, type SubmitSlot } from './SubmitBar'
import { WeekDrawer, type WeekSummary } from './WeekDrawer'
import { Toast } from '@/components/ui/Toast'
import { BottomNav } from '@/components/ui/BottomNav'
import { groupGamesByDay, getKickoffDayKey } from '@/lib/schedule'

interface PicksScreenProps {
  initialWeekId: string
  activeWeekId: string
  initialGames: Game[]
  initialPicks: Pick[]
  weeks: WeekSummary[]
}

// A Map preserves insertion order natively — new games append at the end,
// and re-`.set()`-ing an already-staged game's team keeps its existing
// position — which is exactly the submit bar's "5 dots in tap order,
// compacted" behavior, with no separate order array to keep in sync.
function buildInitialStaged(games: Game[], picks: Pick[]): Map<string, string> {
  const byGameId = new Map(picks.map(p => [p.game_id, p.picked_team]))
  const sorted = games
    .filter(g => byGameId.has(g.id))
    .sort((a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime())
  return new Map(sorted.map(g => [g.id, byGameId.get(g.id)!]))
}

export function PicksScreen({ initialWeekId, activeWeekId, initialGames, initialPicks, weeks }: PicksScreenProps) {
  const [currentWeekId, setCurrentWeekId] = useState(initialWeekId)
  const [games, setGames] = useState<Game[]>(initialGames)

  const [submittedPicks, setSubmittedPicks] = useState<Record<string, Pick>>(
    Object.fromEntries(initialPicks.map(p => [p.game_id, p]))
  )
  const [stagedPicks, setStagedPicks] = useState<Map<string, string>>(
    buildInitialStaged(initialGames, initialPicks)
  )

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [lockedDayKeys, setLockedDayKeys] = useState<Record<string, boolean>>({})
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const router = useRouter()

  const currentWeek = weeks.find(w => w.id === currentWeekId)
  const isActiveWeek = currentWeekId === activeWeekId

  const dayGroups = useMemo(() => groupGamesByDay(games), [games])

  useEffect(() => {
    setLockedDayKeys(
      Object.fromEntries(dayGroups.map(g => [g.dayKey, new Date(g.lockAt).getTime() <= Date.now()]))
    )
  }, [dayGroups])

  function showToast(message: string) {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToastMessage(message)
    toastTimerRef.current = setTimeout(() => setToastMessage(null), 2500)
  }

  // A staged edit never reaches the server until Submit, so when a day
  // locks, any game in it whose staged team doesn't match its last-known
  // submitted team just gets reverted locally — there's nothing server-side
  // to clean up, since the edit was never persisted.
  function handleDayExpired(dayKey: string) {
    setLockedDayKeys(prev => ({ ...prev, [dayKey]: true }))

    const gamesInDay = games.filter(g => getKickoffDayKey(g.kickoff_time) === dayKey)
    const nextStaged = new Map(stagedPicks)
    let revertedAny = false

    for (const game of gamesInDay) {
      const submittedTeam = submittedPicks[game.id]?.picked_team
      if (nextStaged.get(game.id) !== submittedTeam) {
        revertedAny = true
        if (submittedTeam) nextStaged.set(game.id, submittedTeam)
        else nextStaged.delete(game.id)
      }
    }

    if (revertedAny) {
      setStagedPicks(nextStaged)
      showToast('A pick locked before you submitted it, so it was removed.')
    }
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
    setSubmittedPicks({})
    setStagedPicks(new Map())
    setGames([])

    const [gamesRes, picksRes] = await Promise.all([
      fetch(`/api/games?weekId=${weekId}`).then(r => r.json()),
      fetch(`/api/picks?weekId=${weekId}`).then(r => r.json()),
    ])

    const loadedGames: Game[] = gamesRes.games ?? []
    const loadedPicks: Pick[] = picksRes.picks ?? []
    setGames(loadedGames)
    setSubmittedPicks(Object.fromEntries(loadedPicks.map((p: Pick) => [p.game_id, p])))
    setStagedPicks(buildInitialStaged(loadedGames, loadedPicks))
    setLockedDayKeys(
      Object.fromEntries(
        groupGamesByDay(loadedGames).map(g => [g.dayKey, new Date(g.lockAt).getTime() <= Date.now()])
      )
    )
  }

  // Tapping a team only stages it locally — nothing reaches the server
  // until Submit.
  function handlePick(gameId: string, team: string) {
    setStagedPicks(prev => {
      const next = new Map(prev)
      next.set(gameId, team) // .set() on an existing key keeps its position; a new key appends
      return next
    })
  }

  function handleDeselect(gameId: string) {
    setStagedPicks(prev => {
      const next = new Map(prev)
      next.delete(gameId)
      return next
    })
  }

  // Diffs stagedPicks against submittedPicks and syncs the difference via
  // the existing PATCH/DELETE endpoints. Deletes run before patches, and
  // every call runs sequentially — both are required for the server's
  // 5-pick-limit check (which re-queries current DB state per call) to stay
  // correct across a batch that both removes and adds picks.
  async function handleSubmit() {
    const submittingWeekId = currentWeekId
    const toDelete = Object.keys(submittedPicks).filter(
      gameId => !stagedPicks.has(gameId) && games.some(g => g.id === gameId)
    )
    const toPatch = [...stagedPicks.entries()].filter(
      ([gameId, team]) => team !== submittedPicks[gameId]?.picked_team
    )

    if (toDelete.length === 0 && toPatch.length === 0) return

    setIsSubmitting(true)

    try {
      const deletedIds: string[] = []
      const patchedPicks: Pick[] = []
      const failedIds: string[] = []
      let hadUnexpectedFailure = false

      for (const gameId of toDelete) {
        try {
          const res = await fetch('/api/picks', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, weekId: submittingWeekId }),
          })
          if (res.ok) deletedIds.push(gameId)
          else {
            failedIds.push(gameId)
            if (res.status !== 423) hadUnexpectedFailure = true
          }
        } catch {
          failedIds.push(gameId)
          hadUnexpectedFailure = true
        }
      }

      for (const [gameId, team] of toPatch) {
        try {
          const res = await fetch('/api/picks', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId, weekId: submittingWeekId, pickedTeam: team }),
          })
          if (res.ok) {
            const { pick } = await res.json()
            patchedPicks.push(pick)
          } else {
            failedIds.push(gameId)
            if (res.status !== 423) hadUnexpectedFailure = true
          }
        } catch {
          failedIds.push(gameId)
          hadUnexpectedFailure = true
        }
      }

      // If the user switched weeks while this submit was still in flight,
      // the results above belong to a week that's no longer being
      // displayed — discard them rather than merging into the newly-loaded
      // week's state.
      if (currentWeekId !== submittingWeekId) return

      setSubmittedPicks(prev => {
        const next = { ...prev }
        for (const gameId of deletedIds) delete next[gameId]
        for (const pick of patchedPicks) next[pick.game_id] = pick
        return next
      })

      if (failedIds.length > 0) {
        setStagedPicks(prev => {
          const next = new Map(prev)
          for (const gameId of failedIds) {
            const submitted = submittedPicks[gameId]
            if (submitted) next.set(gameId, submitted.picked_team)
            else next.delete(gameId)
          }
          return next
        })
        showToast(
          hadUnexpectedFailure
            ? "Some picks couldn't be submitted — please try again"
            : failedIds.length === 1
              ? "1 pick couldn't be submitted — its game just locked"
              : `${failedIds.length} picks couldn't be submitted — their games just locked`
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const atPickLimit = stagedPicks.size >= 5

  const slots: SubmitSlot[] = [...stagedPicks.entries()]
    .map(([gameId, team]) => {
      const game = games.find(g => g.id === gameId)
      if (!game) return null
      return { game, team, isSynced: submittedPicks[gameId]?.picked_team === team }
    })
    .filter((s): s is SubmitSlot => s !== null)
    .slice(0, 5)

  const isDirty =
    Object.keys(submittedPicks).some(gameId => !stagedPicks.has(gameId)) ||
    [...stagedPicks.entries()].some(([gameId, team]) => team !== submittedPicks[gameId]?.picked_team)

  return (
    <div className="w-full max-w-[430px] mx-auto min-h-screen flex flex-col">
      <PicksHeader
        weekNumber={currentWeek?.week_number ?? 0}
        seasonYear={currentWeek?.season_year ?? new Date().getFullYear()}
        submittedCount={Object.keys(submittedPicks).length}
        onWeekLabelClick={() => setDrawerOpen(true)}
      />

      <div className="flex flex-col gap-2 p-3 pb-[145px] flex-1">
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
                    stagedTeam={stagedPicks.get(game.id) ?? null}
                    submittedPick={submittedPicks[game.id] ?? null}
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

      <SubmitBar slots={slots} isDirty={isDirty} isSubmitting={isSubmitting} onSubmit={handleSubmit} />

      <BottomNav />

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
