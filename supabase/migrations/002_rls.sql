-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.weeks enable row level security;
alter table public.games enable row level security;
alter table public.picks enable row level security;

-- users: authenticated users can read all, write only their own row
create policy "users_select" on public.users
  for select to authenticated using (true);
create policy "users_insert" on public.users
  for insert to authenticated with check (id = auth.uid());
create policy "users_update" on public.users
  for update to authenticated using (id = auth.uid());

-- weeks: all authenticated users can read, no client writes
create policy "weeks_select" on public.weeks
  for select to authenticated using (true);

-- games: all authenticated users can read, no client writes
create policy "games_select" on public.games
  for select to authenticated using (true);

-- picks: users can only see and modify their own picks
create policy "picks_select" on public.picks
  for select to authenticated using (user_id = auth.uid());
create policy "picks_insert" on public.picks
  for insert to authenticated with check (user_id = auth.uid());
create policy "picks_update" on public.picks
  for update to authenticated using (user_id = auth.uid());
create policy "picks_delete" on public.picks
  for delete to authenticated using (user_id = auth.uid());
