export type KickoffSlot = 'thu_night' | 'sun_early' | 'sun_late' | 'sun_night' | 'mon_night' | 'other'

export function computeKickoffSlot(kickoffTimeIso: string): KickoffSlot {
  const d = new Date(kickoffTimeIso)
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(d)

  const weekday = parts.find(p => p.type === 'weekday')!.value
  const hour = parseInt(parts.find(p => p.type === 'hour')!.value, 10)

  if (weekday === 'Thu') return 'thu_night'
  if (weekday === 'Mon') return 'mon_night'
  if (weekday === 'Sun') {
    if (hour < 15) return 'sun_early'
    if (hour < 19) return 'sun_late'
    return 'sun_night'
  }
  return 'other'
}

export function getKickoffDayKey(kickoffTimeIso: string): string {
  const d = new Date(kickoffTimeIso)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

export interface DayGroup<G> {
  dayKey: string
  label: string
  lockAt: string
  games: G[]
}

export function groupGamesByDay<G extends { kickoff_time: string }>(games: G[]): DayGroup<G>[] {
  const byKey = new Map<string, G[]>()
  for (const g of games) {
    const key = getKickoffDayKey(g.kickoff_time)
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key)!.push(g)
  }

  const groups: DayGroup<G>[] = Array.from(byKey.entries()).map(([dayKey, dayGames]) => {
    const sortedGames = [...dayGames].sort(
      (a, b) => new Date(a.kickoff_time).getTime() - new Date(b.kickoff_time).getTime()
    )
    const lockAt = sortedGames[0].kickoff_time
    const label = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
    }).format(new Date(lockAt)).toUpperCase()
    return { dayKey, label, lockAt: new Date(lockAt).toISOString(), games: sortedGames }
  })

  return groups.sort((a, b) => new Date(a.lockAt).getTime() - new Date(b.lockAt).getTime())
}

export function getDayGroupLockTime(
  games: { id: string; kickoff_time: string }[],
  targetGameId: string
): string | null {
  const target = games.find(g => g.id === targetGameId)
  if (!target) return null
  const dayKey = getKickoffDayKey(target.kickoff_time)
  const group = groupGamesByDay(games).find(g => g.dayKey === dayKey)
  return group?.lockAt ?? null
}

export function getSeasonInfo(date: Date): { weekNumber: number; seasonYear: number } {
  // NFL seasons start in September and run into January of the following
  // calendar year, so a January/February game belongs to the season that
  // kicked off the previous September (e.g. Jan 2027 games are the 2026
  // season's Week 18), not a new season.
  const calendarYear = date.getFullYear()
  const seasonYear = date.getMonth() <= 1 ? calendarYear - 1 : calendarYear

  // NFL regular season week 1 starts the Thursday after Labor Day
  // Labor Day = first Monday in September
  const sept1 = new Date(seasonYear, 8, 1)
  const laborDay = new Date(seasonYear, 8, 1 + ((8 - sept1.getDay()) % 7))
  const week1Start = new Date(laborDay)
  week1Start.setDate(laborDay.getDate() + 3) // Thursday
  week1Start.setHours(0, 0, 0, 0)

  const diff = date.getTime() - week1Start.getTime()
  // Clamp anything before the computed Week 1 start (e.g. a Wednesday-night
  // opener) into Week 1 rather than a confusing "Week 0" bucket.
  const weekNumber = diff < 0 ? 1 : Math.floor(diff / (7 * 24 * 60 * 60 * 1000)) + 1

  return { weekNumber, seasonYear }
}
