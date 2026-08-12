import { describe, it, expect } from 'vitest'
import { computeKickoffSlot, getSeasonInfo } from './schedule'

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
