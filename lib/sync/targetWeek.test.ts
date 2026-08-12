import { describe, it, expect } from 'vitest'
import { selectTargetWeek, type WeekCandidate } from './targetWeek'

const now = new Date('2026-09-08T12:00:00Z') // a Tuesday

describe('selectTargetWeek', () => {
  it('picks the earliest not-yet-snapshotted future week', () => {
    const candidates: WeekCandidate[] = [
      { id: 'week-1', lockTime: '2026-09-10T00:20:00Z', alreadySnapshotted: true },
      { id: 'week-2', lockTime: '2026-09-17T00:20:00Z', alreadySnapshotted: false },
      { id: 'week-3', lockTime: '2026-09-24T00:20:00Z', alreadySnapshotted: false },
    ]
    expect(selectTargetWeek(candidates, now)).toBe('week-2')
  })

  it('returns null when every candidate is already snapshotted', () => {
    const candidates: WeekCandidate[] = [
      { id: 'week-1', lockTime: '2026-09-10T00:20:00Z', alreadySnapshotted: true },
      { id: 'week-2', lockTime: '2026-09-17T00:20:00Z', alreadySnapshotted: true },
    ]
    expect(selectTargetWeek(candidates, now)).toBeNull()
  })

  it('ignores an unsnapshotted week whose lock time has already passed', () => {
    const candidates: WeekCandidate[] = [
      { id: 'week-1', lockTime: '2026-09-01T00:20:00Z', alreadySnapshotted: false }, // past, e.g. a bye/data gap
      { id: 'week-2', lockTime: '2026-09-17T00:20:00Z', alreadySnapshotted: false },
    ]
    expect(selectTargetWeek(candidates, now)).toBe('week-2')
  })

  it('returns null for an empty candidate list', () => {
    expect(selectTargetWeek([], now)).toBeNull()
  })

  it('returns null when no candidate is eligible because every lock time has already passed', () => {
    const candidates: WeekCandidate[] = [
      { id: 'week-1', lockTime: '2026-09-01T00:20:00Z', alreadySnapshotted: false },
      { id: 'week-2', lockTime: '2026-09-03T00:20:00Z', alreadySnapshotted: false },
    ]
    expect(selectTargetWeek(candidates, now)).toBeNull()
  })
})
