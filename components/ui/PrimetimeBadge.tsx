import type { KickoffSlot } from '@/lib/schedule'

const labels: Record<'thu_night' | 'sun_night' | 'mon_night', string> = {
  thu_night: 'TNF',
  sun_night: 'SNF',
  mon_night: 'MNF',
}

export function PrimetimeBadge({ kickoffSlot }: { kickoffSlot: KickoffSlot | null }) {
  if (kickoffSlot !== 'thu_night' && kickoffSlot !== 'sun_night' && kickoffSlot !== 'mon_night') {
    return null
  }

  return (
    <span className="text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-pill bg-purple-100 text-purple-700">
      {labels[kickoffSlot]}
    </span>
  )
}
