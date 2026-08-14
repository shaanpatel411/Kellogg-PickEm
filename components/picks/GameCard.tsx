'use client'
import { StatusPill } from '@/components/ui/StatusPill'
import { PrimetimeBadge } from '@/components/ui/PrimetimeBadge'
import type { KickoffSlot } from '@/lib/schedule'
import { teamLogoUrl } from '@/lib/teams'

export interface Pick {
  game_id: string
  picked_team: string
  result: 'pending' | 'win' | 'loss' | 'push'
}

export interface Game {
  id: string
  home_team: string
  away_team: string
  home_team_full: string
  away_team_full: string
  spread: number | null
  kickoff_time: string
  kickoff_slot: KickoffSlot | null
  broadcast_network: string | null
  status: 'scheduled' | 'in_progress' | 'final'
  final_home_score: number | null
  final_away_score: number | null
}

interface GameCardProps {
  game: Game
  stagedTeam: string | null
  submittedPick: Pick | null
  isLocked: boolean
  atPickLimit: boolean
  isActiveWeek: boolean
  onPick: (gameId: string, team: string) => void
  onDeselect: (gameId: string) => void
  onBlockedTap: () => void
  onLockedTap: () => void
}

function formatKickoff(isoString: string, broadcastNetwork: string | null): string {
  const d = new Date(isoString)
  const formatted = d.toLocaleString('en-US', {
    weekday: 'short', hour: 'numeric', minute: '2-digit',
    timeZoneName: 'short', timeZone: 'America/Chicago',
  })
  return broadcastNetwork ? `${formatted} — ${broadcastNetwork}` : formatted
}

export function spreadLabel(spread: number | null, isHome: boolean): string {
  if (spread === null) return '—'
  const val = isHome ? spread : -spread
  return val > 0 ? `+${val}` : `${val}`
}

const lockBadge = (
  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-gray-11 flex items-center justify-center">
    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  </span>
)

export function GameCard({ game, stagedTeam, submittedPick, isLocked, atPickLimit, isActiveWeek, onPick, onDeselect, onBlockedTap, onLockedTap }: GameCardProps) {
  const hasStagedPick = stagedTeam !== null
  const isGraded = submittedPick !== null && submittedPick.result !== 'pending'
  const hasSpread = game.spread !== null && (isActiveWeek || isLocked)
  const displaySpread = hasSpread ? game.spread : null

  // Once a day locks, staged and submitted are guaranteed to match for every
  // game in it (PicksScreen reverts any unsynced edit at that moment) — so
  // graded/locked states can safely read submittedPick, and only the
  // pre-lock editable state needs stagedTeam.
  function isPickedFor(teamCode: string): boolean {
    if (isGraded || isLocked) return submittedPick?.picked_team === teamCode
    return stagedTeam === teamCode
  }

  // Determine pill to show in center column
  let centerStatus: 'pending' | 'win' | 'loss' | 'push' | 'tbd' | null = null
  if (!hasSpread) centerStatus = 'tbd'
  else if (isGraded) centerStatus = submittedPick!.result as 'win' | 'loss' | 'push'
  else if (submittedPick !== null && isLocked) centerStatus = 'pending'

  // Center column content
  const centerScore = isGraded && game.final_home_score !== null
    ? `${game.away_team} ${game.final_away_score}\n${game.home_team} ${game.final_home_score}`
    : null

  function getSideStyle(teamCode: string): string {
    const base = 'flex-1 flex flex-col items-center justify-center py-2.5 px-1.5'
    if (!hasSpread) return `${base} opacity-40 cursor-default`
    if (isGraded) {
      if (isPickedFor(teamCode)) {
        const color = submittedPick!.result === 'win' ? 'bg-green' : submittedPick!.result === 'loss' ? 'bg-red' : 'bg-gray-9'
        return `${base} ${color} cursor-default`
      }
      return `${base} opacity-40 cursor-default`
    }
    if (isLocked) {
      if (isPickedFor(teamCode)) return `${base} bg-purple-700 cursor-default`
      return `${base} hover:bg-purple-100 cursor-pointer`
    }
    // Before lock
    if (isPickedFor(teamCode)) return `${base} bg-purple-700 cursor-pointer`
    if (atPickLimit && !hasStagedPick) return `${base} opacity-40 cursor-default`
    return `${base} hover:bg-purple-100 cursor-pointer`
  }

  function handleSideTap(teamCode: string) {
    if (!hasSpread) {
      onBlockedTap()
      return
    }
    if (isGraded) return
    if (isLocked) {
      if (!isPickedFor(teamCode)) {
        onLockedTap()
      }
      return
    }
    if (stagedTeam === teamCode) {
      onDeselect(game.id)
    } else if (!atPickLimit || hasStagedPick) {
      onPick(game.id, teamCode)
    }
  }

  const isHomePicked = isPickedFor(game.home_team)
  const isAwayPicked = isPickedFor(game.away_team)
  const textColor = (picked: boolean, graded: boolean) =>
    picked && graded ? 'text-white' : picked ? 'text-white' : 'text-gray-11'

  return (
    <div className={`flex overflow-hidden rounded-xl border-[1.5px] min-h-[68px] bg-white transition-colors ${
      !hasSpread ? 'border-gray-1 opacity-65' :
      isGraded && submittedPick?.result === 'win' ? 'border-green' :
      isGraded && submittedPick?.result === 'loss' ? 'border-red' :
      isGraded && submittedPick?.result === 'push' ? 'border-gray-4' :
      hasStagedPick ? 'border-purple-300' : 'border-gray-1'
    }`}>

      {/* Away side */}
      <div
        className={getSideStyle(game.away_team)}
        onClick={() => handleSideTap(game.away_team)}
      >
        <div className="relative">
          <img
            src={teamLogoUrl(game.away_team)}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            decoding="async"
            className="w-11 h-11 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          {isLocked && isAwayPicked && lockBadge}
        </div>
        <span className={`text-[12px] font-extrabold leading-none ${textColor(isAwayPicked, isGraded)}`}>
          {game.away_team}
        </span>
        <span className={`text-[12px] font-semibold font-mono mt-0.5 ${
          isAwayPicked ? 'text-white/85' : 'text-purple-700'
        }`}>
          {spreadLabel(displaySpread, false)}
        </span>
      </div>

      {/* Center column */}
      <div className={`flex flex-col items-center justify-center px-1.5 py-2 gap-1 min-w-[56px] ${
        isGraded && submittedPick?.result === 'win' ? 'bg-green-light' :
        isGraded && submittedPick?.result === 'loss' ? 'bg-red-light' :
        isGraded && submittedPick?.result === 'push' ? 'bg-gray-1' :
        submittedPick !== null && isLocked ? 'bg-gold-light' : 'bg-gray-1'
      }`}>
        <PrimetimeBadge kickoffSlot={game.kickoff_slot} kickoffTime={game.kickoff_time} />
        {centerScore ? (
          <span className={`text-[10px] font-semibold font-mono text-center whitespace-pre-line leading-snug ${
            submittedPick?.result === 'win' ? 'text-green' : submittedPick?.result === 'loss' ? 'text-red' : 'text-gray-9'
          }`}>
            {centerScore}
          </span>
        ) : (
          <span className="text-[10px] text-gray-9 font-medium text-center leading-snug">
            {formatKickoff(game.kickoff_time, game.broadcast_network)}
          </span>
        )}
        {centerStatus && <StatusPill status={centerStatus} />}
      </div>

      {/* Home side */}
      <div
        className={getSideStyle(game.home_team)}
        onClick={() => handleSideTap(game.home_team)}
      >
        <div className="relative">
          <img
            src={teamLogoUrl(game.home_team)}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            decoding="async"
            className="w-11 h-11 object-contain"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          {isLocked && isHomePicked && lockBadge}
        </div>
        <span className={`text-[12px] font-extrabold leading-none ${textColor(isHomePicked, isGraded)}`}>
          {game.home_team}
        </span>
        <span className={`text-[12px] font-semibold font-mono mt-0.5 ${
          isHomePicked ? 'text-white/85' : 'text-purple-700'
        }`}>
          {spreadLabel(displaySpread, true)}
        </span>
      </div>

    </div>
  )
}
