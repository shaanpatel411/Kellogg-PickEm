export interface WeekCandidate {
  id: string
  lockTime: string
  alreadySnapshotted: boolean
}

export function selectTargetWeek(candidates: WeekCandidate[], now: Date): string | null {
  const eligible = candidates.filter(
    w => !w.alreadySnapshotted && new Date(w.lockTime).getTime() > now.getTime()
  )
  if (eligible.length === 0) return null

  eligible.sort((a, b) => new Date(a.lockTime).getTime() - new Date(b.lockTime).getTime())
  return eligible[0].id
}
