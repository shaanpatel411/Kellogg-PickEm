import { describe, it, expect, vi, beforeEach } from 'vitest'
import { syncLines } from './syncLines'
import type { NormalizedGame } from '@/lib/odds-api/types'
import type { EspnBroadcastEvent } from '@/lib/espn/scoreboard'

// --- Minimal in-memory fake for exactly the Supabase call shapes syncLines makes ---

interface FakeWeek {
  id: string
  week_number: number
  season_year: number
  lock_time: string
  lines_snapshot_at: string | null
}

let fakeWeeks: FakeWeek[]
let fakeGames: Map<string, Record<string, unknown>>
let nextWeekId: number

function createFakeAdminClient() {
  return {
    from(table: 'weeks' | 'games') {
      if (table === 'weeks') {
        return {
          upsert(row: { week_number: number; season_year: number; lock_time: string }) {
            let week = fakeWeeks.find(
              w => w.week_number === row.week_number && w.season_year === row.season_year
            )
            if (!week) {
              week = { id: `week-${nextWeekId++}`, week_number: row.week_number, season_year: row.season_year, lock_time: row.lock_time, lines_snapshot_at: null }
              fakeWeeks.push(week)
            } else {
              week.lock_time = row.lock_time
            }
            const found = week
            return {
              select: () => ({
                single: async () => ({ data: { id: found.id, lines_snapshot_at: found.lines_snapshot_at }, error: null }),
              }),
            }
          },
          update(patch: Partial<FakeWeek>) {
            return {
              eq: (_col: string, id: string) => ({
                is: async (col: string) => {
                  const week = fakeWeeks.find(w => w.id === id)
                  if (week && (week as unknown as Record<string, unknown>)[col] === null) Object.assign(week, patch)
                  return { error: null }
                },
              }),
            }
          },
        }
      }
      // games table
      return {
        upsert: async (rows: Array<Record<string, unknown>>) => {
          for (const row of rows) {
            fakeGames.set(row.odds_api_id as string, { ...(fakeGames.get(row.odds_api_id as string) ?? {}), ...row })
          }
          return { error: null }
        },
      }
    },
  }
}

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => createFakeAdminClient() }))

let mockGames: NormalizedGame[]
vi.mock('@/lib/odds-api/adapter', () => ({ fetchGamesForWeek: async () => mockGames }))

let mockEspnEvents: EspnBroadcastEvent[]
let espnShouldFail: boolean
vi.mock('@/lib/espn/scoreboard', async () => {
  const actual = await vi.importActual<typeof import('@/lib/espn/scoreboard')>('@/lib/espn/scoreboard')
  return {
    ...actual,
    fetchEspnScoreboard: async () => {
      if (espnShouldFail) throw new Error('ESPN down')
      return mockEspnEvents
    },
  }
})

function game(overrides: Partial<NormalizedGame> & { oddsApiId: string }): NormalizedGame {
  return {
    homeTeam: 'SEA',
    awayTeam: 'NE',
    homeTeamFull: 'Seahawks',
    awayTeamFull: 'Patriots',
    favoriteTeam: 'SEA',
    spread: -3.5,
    kickoffTime: '2026-09-13T17:00:00Z',
    ...overrides,
  }
}

beforeEach(() => {
  fakeWeeks = []
  fakeGames = new Map()
  nextWeekId = 1
  mockGames = []
  mockEspnEvents = []
  espnShouldFail = false
})

describe('syncLines', () => {
  it('snapshots exactly the earliest eligible week and writes its spread', async () => {
    mockGames = [
      game({ oddsApiId: 'w1', kickoffTime: '2026-09-13T17:00:00Z', spread: -3.5 }),
      game({ oddsApiId: 'w2', kickoffTime: '2026-09-20T17:00:00Z', spread: -1 }),
    ]

    const result = await syncLines()

    expect(result.weeksProcessed.filter(w => w.snapshotted)).toHaveLength(1)
    expect(fakeGames.get('w1')!.spread).toBe(-3.5)
    expect(fakeGames.get('w2')!.spread).toBeUndefined() // never written — column default (null) applies
  })

  it("freezes a snapshotted week's spread on a later run even if the line changed", async () => {
    mockGames = [game({ oddsApiId: 'w1', kickoffTime: '2026-09-13T17:00:00Z', spread: -3.5 })]
    await syncLines()

    mockGames = [game({ oddsApiId: 'w1', kickoffTime: '2026-09-13T17:00:00Z', spread: -7 })] // line moved
    await syncLines()

    expect(fakeGames.get('w1')!.spread).toBe(-3.5) // unchanged
  })

  it('writes kickoff_slot for every week, and matches broadcast_network by date so repeat matchups do not collide', async () => {
    // CIN@TB twice in the season (division rivals) — only the game on the
    // date ESPN actually has an event for should get the network.
    mockGames = [
      game({ oddsApiId: 'w1', homeTeam: 'CIN', awayTeam: 'TB', kickoffTime: '2026-09-13T17:00:00Z' }),
      game({ oddsApiId: 'w2', homeTeam: 'CIN', awayTeam: 'TB', kickoffTime: '2026-09-20T17:00:00Z' }),
    ]
    mockEspnEvents = [
      {
        date: '2026-09-13T17:00:00Z',
        competitions: [{
          competitors: [
            { homeAway: 'home', team: { abbreviation: 'CIN' } },
            { homeAway: 'away', team: { abbreviation: 'TB' } },
          ],
          broadcasts: [{ names: ['FOX'] }],
        }],
      },
    ]

    await syncLines()

    expect(fakeGames.get('w1')!.kickoff_slot).toBe('sun_early')
    expect(fakeGames.get('w2')!.kickoff_slot).toBe('sun_early')
    expect(fakeGames.get('w1')!.broadcast_network).toBe('FOX')
    expect(fakeGames.get('w2')!.broadcast_network).toBeUndefined() // different date, no matching ESPN event — key omitted, not written as null
  })

  it('completes successfully when ESPN enrichment fails', async () => {
    mockGames = [game({ oddsApiId: 'w1' })]
    espnShouldFail = true

    const result = await syncLines()

    expect(result.synced).toBe(1)
    expect(fakeGames.get('w1')!.broadcast_network).toBeUndefined()
  })

  it('does not overwrite an existing broadcast_network with null when ESPN enrichment fails on a later run', async () => {
    mockGames = [game({ oddsApiId: 'w1', kickoffTime: '2026-09-13T17:00:00Z', homeTeam: 'CIN', awayTeam: 'TB' })]
    mockEspnEvents = [
      {
        date: '2026-09-13T17:00:00Z',
        competitions: [{
          competitors: [
            { homeAway: 'home', team: { abbreviation: 'CIN' } },
            { homeAway: 'away', team: { abbreviation: 'TB' } },
          ],
          broadcasts: [{ names: ['FOX'] }],
        }],
      },
    ]
    await syncLines()
    expect(fakeGames.get('w1')!.broadcast_network).toBe('FOX')

    // Next run: ESPN is down, but the game already has a network from before.
    espnShouldFail = true
    await syncLines()

    expect(fakeGames.get('w1')!.broadcast_network).toBe('FOX') // untouched, not nulled out
  })

  it('leaves spread/favorite_team unset (not explicit null) for a target-week game with no posted line yet', async () => {
    // A game whose bookmaker hasn't posted a line at the exact moment its
    // week becomes the sync target should not get an explicit spread: null
    // written — that would look identical to any other "priced" write and
    // give no signal that this game is still genuinely open, unlike a
    // withheld key (same technique already used for non-target weeks).
    mockGames = [
      game({ oddsApiId: 'w1', kickoffTime: '2026-09-13T17:00:00Z', spread: -3.5 }),
      game({ oddsApiId: 'w2', kickoffTime: '2026-09-13T20:00:00Z', spread: null, favoriteTeam: null }),
    ]

    const result = await syncLines()

    expect(result.weeksProcessed.filter(w => w.snapshotted)).toHaveLength(1)
    expect(fakeGames.get('w1')!.spread).toBe(-3.5)
    expect(fakeGames.get('w2')!.spread).toBeUndefined() // no line posted yet — omitted, not written as null
    expect(fakeGames.get('w2')!.favorite_team).toBeUndefined()
  })
})
