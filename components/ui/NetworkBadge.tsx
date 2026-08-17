export function NetworkBadge({ network }: { network: string | null }) {
  if (!network) return null
  return (
    <span className="text-[9px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-pill bg-purple-100 text-purple-700">
      {network}
    </span>
  )
}
