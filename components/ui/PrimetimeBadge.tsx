import type { KickoffSlot } from '@/lib/schedule'

const labels: Record<'thu_night' | 'sun_night' | 'mon_night', string> = {
  thu_night: 'TNF',
  sun_night: 'SNF',
  mon_night: 'MNF',
}

function isEveningEastern(kickoffTime: string): boolean {
  const hour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(new Date(kickoffTime)),
    10
  )
  return hour >= 19
}

export function PrimetimeBadge({
  kickoffSlot,
  kickoffTime,
}: {
  kickoffSlot: KickoffSlot | null
  kickoffTime: string
}) {
  if (kickoffSlot !== 'thu_night' && kickoffSlot !== 'sun_night' && kickoffSlot !== 'mon_night') {
    return null
  }
  if ((kickoffSlot === 'thu_night' || kickoffSlot === 'mon_night') && !isEveningEastern(kickoffTime)) {
    return null
  }

  return (
    <span className="text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-pill bg-purple-100 text-purple-700">
      {labels[kickoffSlot]}
    </span>
  )
}
