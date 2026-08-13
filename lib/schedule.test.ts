import { describe, it, expect } from 'vitest'
import { computeKickoffSlot, getSeasonInfo, getKickoffDayKey, groupGamesByDay, getDayGroupLockTime } from './schedule'

describe('computeKickoffSlot', () => {
  it('labels a Thursday night kickoff', () => {
    // Thu Sept 10 2026, 8:20 PM EDT
    expect(computeKickoffSlot('2026-09-11T00:20:00Z')).toBe('thu_night')
  })

  it('labels a Sunday early kickoff', () => {
    // Sun Sept 13 2026, 1:00 PM EDT
    expect(computeKickoffSlot('2026-09-13T17:00:00Z')).toBe('sun_early')
  })

  it('labels a Sunday late-afternoon kickoff', () => {
    // Sun Sept 13 2026, 4:25 PM EDT
    expect(computeKickoffSlot('2026-09-13T20:25:00Z')).toBe('sun_late')
  })

  it('labels a Sunday night kickoff', () => {
    // Sun Sept 13 2026, 8:20 PM EDT (crosses into the next UTC day)
    expect(computeKickoffSlot('2026-09-14T00:20:00Z')).toBe('sun_night')
  })

  it('labels a Monday night kickoff', () => {
    // Mon Sept 14 2026, 8:15 PM EDT
    expect(computeKickoffSlot('2026-09-15T00:15:00Z')).toBe('mon_night')
  })

  it('labels anything else as other', () => {
    // Sat Sept 12 2026, 2:00 PM EDT
    expect(computeKickoffSlot('2026-09-12T18:00:00Z')).toBe('other')
  })
})

describe('getSeasonInfo', () => {
  it('assigns Week 1 to the season-opening Thursday', () => {
    const { weekNumber, seasonYear } = getSeasonInfo(new Date('2026-09-10T00:20:00Z'))
    expect(weekNumber).toBe(1)
    expect(seasonYear).toBe(2026)
  })

  it('assigns a January game to the previous calendar year\'s season (Week 18)', () => {
    const { weekNumber, seasonYear } = getSeasonInfo(new Date('2027-01-11T00:00:00Z'))
    expect(weekNumber).toBe(18)
    expect(seasonYear).toBe(2026)
  })
})

describe('getKickoffDayKey', () => {
  it('groups a Thursday night kickoff under its Eastern calendar date', () => {
    expect(getKickoffDayKey('2026-09-11T00:20:00Z')).toBe('2026-09-10')
  })

  it('groups all Sunday kickoff windows (early, late, night) under the same Eastern calendar date, even when the UTC date has rolled over', () => {
    expect(getKickoffDayKey('2026-09-13T17:00:00Z')).toBe('2026-09-13')
    expect(getKickoffDayKey('2026-09-13T20:25:00Z')).toBe('2026-09-13')
    expect(getKickoffDayKey('2026-09-14T00:20:00Z')).toBe('2026-09-13')
  })

  it('groups a Monday night kickoff under its Eastern calendar date', () => {
    expect(getKickoffDayKey('2026-09-15T00:15:00Z')).toBe('2026-09-14')
  })
})

describe('groupGamesByDay', () => {
  const games = [
    { id: 'thu', kickoff_time: '2026-09-11T00:20:00Z' },
    { id: 'sun-early', kickoff_time: '2026-09-13T17:00:00Z' },
    { id: 'sun-late', kickoff_time: '2026-09-13T20:25:00Z' },
    { id: 'sun-night', kickoff_time: '2026-09-14T00:20:00Z' },
    { id: 'mon', kickoff_time: '2026-09-15T00:15:00Z' },
  ]

  it('groups games into day buckets ordered by lock time, with correct labels', () => {
    const groups = groupGamesByDay(games)
    expect(groups.map(g => g.label)).toEqual(['THURSDAY', 'SUNDAY', 'MONDAY'])
    expect(groups.map(g => g.games.length)).toEqual([1, 3, 1])
  })

  it("locks the Sunday group at its earliest kickoff (1:00 PM ET), not each game's own kickoff", () => {
    const groups = groupGamesByDay(games)
    const sunday = groups.find(g => g.label === 'SUNDAY')!
    expect(sunday.lockAt).toBe(new Date('2026-09-13T17:00:00Z').toISOString())
  })

  it("sorts each group's games by kickoff time", () => {
    const groups = groupGamesByDay(games)
    const sunday = groups.find(g => g.label === 'SUNDAY')!
    expect(sunday.games.map(g => g.id)).toEqual(['sun-early', 'sun-late', 'sun-night'])
  })
})

describe('getDayGroupLockTime', () => {
  const games = [
    { id: 'thu', kickoff_time: '2026-09-11T00:20:00Z' },
    { id: 'sun-early', kickoff_time: '2026-09-13T17:00:00Z' },
    { id: 'sun-late', kickoff_time: '2026-09-13T20:25:00Z' },
  ]

  it("returns the target game's day-group lock time, not its own kickoff", () => {
    expect(getDayGroupLockTime(games, 'sun-late')).toBe(new Date('2026-09-13T17:00:00Z').toISOString())
  })

  it("returns the game's own kickoff when it is the only game that day", () => {
    expect(getDayGroupLockTime(games, 'thu')).toBe(new Date('2026-09-11T00:20:00Z').toISOString())
  })

  it('returns null for a game id not present in the list', () => {
    expect(getDayGroupLockTime(games, 'missing')).toBeNull()
  })
})
