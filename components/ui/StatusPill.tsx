type Status = 'win' | 'loss' | 'push' | 'pending' | 'tbd'

const styles: Record<Status, string> = {
  win:     'bg-green-light text-green border border-green',
  loss:    'bg-red-light text-red border border-red',
  push:    'bg-gray-1 text-gray-9 border border-gray-4',
  pending: 'bg-gold-light text-gold border border-gold',
  tbd:     'bg-gray-1 text-gray-9',
}

const labels: Record<Status, string> = {
  win: 'Win', loss: 'Loss', push: 'Push', pending: 'Pending', tbd: 'Spread TBD',
}

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-pill ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}
