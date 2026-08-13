'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function PicksIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 11h6" />
      <path d="M9 15h6" />
      <path d="M9 19h3" />
    </svg>
  )
}

function StandingsIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M3 3v18h18" />
      <rect x="7" y="13" width="3" height="5" rx="0.5" />
      <rect x="12" y="9" width="3" height="9" rx="0.5" />
      <rect x="17" y="5" width="3" height="13" rx="0.5" />
    </svg>
  )
}

function AccountIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3" />
      <path d="M6.5 18.5a6 6 0 0 1 11 0" />
    </svg>
  )
}

interface NavItem {
  href: string
  label: string
  icon: ReactNode
  disabled?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { href: '/picks', label: 'Picks', icon: <PicksIcon /> },
  { href: '/standings', label: 'Standings', icon: <StandingsIcon />, disabled: true },
  { href: '/account', label: 'Account', icon: <AccountIcon />, disabled: true },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[430px] h-[58px] bg-white border-t-[1.5px] border-gray-1 flex items-center justify-around">
      {NAV_ITEMS.map(item => {
        const isActive = !item.disabled && pathname === item.href
        const textColor = item.disabled ? 'text-gray-4' : isActive ? 'text-purple-700' : 'text-gray-9'

        const content = (
          <span
            className={`flex flex-col items-center justify-center gap-0.5 w-16 h-[42px] rounded-pill transition-colors ${
              isActive
                ? 'bg-linear-to-b from-white to-gray-1/60 shadow-[0_1px_3px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]'
                : ''
            }`}
          >
            <span className={textColor}>{item.icon}</span>
            <span className={`text-[11px] font-semibold ${textColor}`}>{item.label}</span>
          </span>
        )

        if (item.disabled) {
          return (
            <span key={item.href} aria-disabled="true" className="cursor-default select-none">
              {content}
            </span>
          )
        }

        return (
          <Link key={item.href} href={item.href} aria-current={isActive ? 'page' : undefined}>
            {content}
          </Link>
        )
      })}
    </nav>
  )
}
