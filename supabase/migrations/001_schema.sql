-- Users (mirrors Supabase Auth users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null default 'player' check (role in ('player', 'commissioner')),
  created_at timestamptz not null default now()
);

-- Weeks
create table public.weeks (
  id uuid primary key default gen_random_uuid(),
  week_number int not null,
  season_year int not null,
  lock_time timestamptz not null,
  unique (week_number, season_year)
);

-- Games
create table public.games (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.weeks(id) on delete cascade,
  home_team text not null,
  away_team text not null,
  home_team_full text not null,
  away_team_full text not null,
  favorite_team text,
  spread numeric,
  kickoff_time timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'final')),
  final_home_score int,
  final_away_score int,
  odds_api_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Picks
create table public.picks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  week_id uuid not null references public.weeks(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  picked_team text not null,
  spread_at_pick_time numeric not null,
  result text not null default 'pending' check (result in ('pending', 'win', 'loss', 'push')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_id)
);
