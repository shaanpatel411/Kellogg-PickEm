'use client'
import { StatusPill } from '@/components/ui/StatusPill'
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
  status: 'scheduled' | 'in_progress' | 'final'
  final_home_score: number | null
  final_away_score: number | null
}

interface GameCardProps {
  game: Game
  pick: Pick | null
  isLocked: boolean
  atPickLimit: boolean
  onPick: (gameId: string, team: string) => void
  onDeselect: (gameId: string) => void
  onBlockedTap: () => void
}

function formatKickoff(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleString('en-US', {
    weekday: 'short', hour: 'numeric', minute: '2-digit',
    timeZoneName: 'short', timeZone: 'America/New_York',
  })
}

function spreadLabel(spread: number | null, isHome: boolean): string {
  if (spread === null) return '—'
  const val = isHome ? spread : -spread
  return val > 0 ? `+${val}` : `${val}`
}

export function GameCard({ game, pick, isLocked, atPickLimit, onPick, onDeselect, onBlockedTap }: GameCardProps) {
  const hasPick = pick !== null
  const isGraded = hasPick && pick.result !== 'pending'
  const hasSpread = game.spread !== null

  // Determine pill to show in center column
  let centerStatus: 'pending' | 'win' | 'loss' | 'push' | 'tbd' | null = null
  if (!hasSpread) centerStatus = 'tbd'
  else if (isGraded) centerStatus = pick!.result as 'win' | 'loss' | 'push'
  else if (hasPick && isLocked) centerStatus = 'pending'

  // Center column content
  const centerScore = isGraded && game.final_home_score !== null
    ? `${game.away_team} ${game.final_away_score}\n${game.home_team} ${game.final_home_score}`
    : null

  function getSideStyle(teamCode: string): string {
    const base = 'flex-1 flex flex-col items-center justify-center py-2.5 px-1.5'
    if (!hasSpread) return `${base} opacity-40 cursor-default`
    if (isGraded) {
      if (pick!.picked_team === teamCode) {
        const color = pick!.result === 'win' ? 'bg-green' : pick!.result === 'loss' ? 'bg-red' : 'bg-gray-9'
        return `${base} ${color} cursor-default`
      }
      return `${base} opacity-40 cursor-default`
    }
    if (isLocked) {
      if (pick?.picked_team === teamCode) return `${base} bg-purple-700 cursor-default`
      return `${base} opacity-40 cursor-default`
    }
    // Before lock
    if (pick?.picked_team === teamCode) return `${base} bg-purple-700 cursor-pointer`
    if (atPickLimit && !hasPick) return `${base} opacity-40 cursor-default`
    return `${base} hover:bg-purple-100 cursor-pointer`
  }

  function handleSideTap(teamCode: string) {
    if (!hasSpread) {
      onBlockedTap()
      return
    }
    if (isLocked || isGraded) return
    if (pick?.picked_team === teamCode) {
      onDeselect(game.id)
    } else if (!atPickLimit || hasPick) {
      onPick(game.id, teamCode)
    }
  }

  const pickedTeam = pick?.picked_team
  const isHomePicked = pickedTeam === game.home_team
  const isAwayPicked = pickedTeam === game.away_team
  const textColor = (picked: boolean, graded: boolean) =>
    picked && graded ? 'text-white' : picked ? 'text-white' : 'text-gray-11'

  return (
    <div className={`flex overflow-hidden rounded-xl border-[1.5px] min-h-[68px] bg-white transition-colors ${
      !hasSpread ? 'border-gray-1 opacity-65' :
      isGraded && pick?.result === 'win' ? 'border-green' :
      isGraded && pick?.result === 'loss' ? 'border-red' :
      isGraded && pick?.result === 'push' ? 'border-gray-4' :
      hasPick ? 'border-purple-300' : 'border-gray-1'
    }`}>

      {/* Away side */}
      <div
        className={getSideStyle(game.away_team)}
        onClick={() => handleSideTap(game.away_team)}
      >
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
        <span className={`text-[12px] font-extrabold leading-none ${textColor(isAwayPicked, isGraded)}`}>
          {game.away_team}
        </span>
        <span className={`text-[12px] font-semibold font-mono mt-0.5 ${
          isAwayPicked ? 'text-white/85' : 'text-purple-700'
        }`}>
          {spreadLabel(game.spread, false)}
        </span>
      </div>

      {/* Center column */}
      <div className={`flex flex-col items-center justify-center px-1.5 py-2 gap-1 min-w-[56px] ${
        isGraded && pick?.result === 'win' ? 'bg-green-light' :
        isGraded && pick?.result === 'loss' ? 'bg-red-light' :
        isGraded && pick?.result === 'push' ? 'bg-gray-1' :
        hasPick && isLocked ? 'bg-gold-light' : 'bg-gray-1'
      }`}>
        {centerScore ? (
          <span className={`text-[10px] font-semibold font-mono text-center whitespace-pre-line leading-snug ${
            pick?.result === 'win' ? 'text-green' : pick?.result === 'loss' ? 'text-red' : 'text-gray-9'
          }`}>
            {centerScore}
          </span>
        ) : (
          <span className="text-[10px] text-gray-9 font-medium text-center leading-snug">
            {formatKickoff(game.kickoff_time)}
          </span>
        )}
        {centerStatus && <StatusPill status={centerStatus} />}
      </div>

      {/* Home side */}
      <div
        className={getSideStyle(game.home_team)}
        onClick={() => handleSideTap(game.home_team)}
      >
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
        <span className={`text-[12px] font-extrabold leading-none ${textColor(isHomePicked, isGraded)}`}>
          {game.home_team}
        </span>
        <span className={`text-[12px] font-semibold font-mono mt-0.5 ${
          isHomePicked ? 'text-white/85' : 'text-purple-700'
        }`}>
          {spreadLabel(game.spread, true)}
        </span>
      </div>

    </div>
  )
}
